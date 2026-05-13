// Cookable — generate-recipes Edge Function
//
// Flow:
//   1. Verify the caller's JWT and load the matching `scans` row.
//   2. Load the user's profile (skill, cuisines, dietary).
//   3. Enforce the free-tier scan limit (3 / rolling 7 days).
//   4. Compute a SHA-256 cache key over (image_path + skill + cuisines + dietary).
//      If a recent scan with the same key already has recipes, return that.
//   5. Download the image from Storage (private bucket, service role) → base64.
//   6. Call Claude Sonnet 4.6 with the system prompt from 07-ai-prompt-spec.md.
//      Retry once on JSON parse failure.
//   7. Persist results (ingredients, recipes, cost, latency, cache_key) to scans.
//   8. Increment the user's weekly scan counter.
//
// Body shape:
//   POST { scan_id: string,
//          additional_ingredients?: string[],
//          removed_ingredients?: string[] }
//
// Response on success:
//   { detected_ingredients, recipes, scan_id, cached: boolean }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096
const FREE_SCAN_LIMIT = 3
const ANONYMOUS_SCAN_LIMIT = 1
const CACHE_WINDOW_MINUTES = 10

// Sonnet 4.x pricing (USD per 1M tokens). Stored as cents.
const PRICE_INPUT_PER_MTOK = 3.0
const PRICE_OUTPUT_PER_MTOK = 15.0

const SYSTEM_PROMPT = `You are Cookable's recipe engine. You analyze fridge/pantry photos and generate practical recipes that prioritize ingredients about to expire.

CRITICAL RULES:
1. Only use ingredients visible in the image OR explicitly added by the user. Never invent ingredients.
2. You may assume the user has these pantry staples unless told otherwise: salt, pepper, cooking oil, water, basic dried herbs.
3. If an ingredient looks past its prime (browning, wilting, soft), flag it as "expiring_soon" and prioritize recipes that use it FIRST.
4. Match recipe complexity to the user's skill level. Beginner = ≤6 ingredients, ≤30 min, no advanced techniques. Intermediate = standard home cooking. Confident = can include techniques like reducing, deglazing, tempering.
5. Bias toward the user's preferred cuisines but don't force-fit. If ingredients don't suit Italian, don't make bad Italian.

OUTPUT FORMAT (strict JSON, no markdown, no preamble):
{
  "detected_ingredients": [
    {"name": "string", "quantity_estimate": "string", "expiring_soon": boolean, "confidence": "high|medium|low"}
  ],
  "recipes": [
    {
      "title": "string",
      "cuisine": "string",
      "cook_time_minutes": number,
      "difficulty": "beginner|intermediate|confident",
      "uses_expiring": ["ingredient names that are expiring_soon"],
      "ingredients_used": [{"name": "string", "amount": "string"}],
      "ingredients_missing": [{"name": "string", "amount": "string", "optional": boolean}],
      "steps": ["string", "string", ...],
      "why_this_recipe": "1 sentence explaining why this fits the user's situation"
    }
  ]
}

Generate exactly 3 recipes. At least 2 must use any ingredients flagged expiring_soon. Recipes should be genuinely different from each other (different cuisine, technique, or meal type — not three pasta dishes).`

interface RequestBody {
  scan_id: string
  source?: string
  additional_ingredients?: string[]
  removed_ingredients?: string[]
}

interface DetectedIngredient {
  name: string
  quantity_estimate: string
  expiring_soon: boolean
  confidence: 'high' | 'medium' | 'low'
}

interface Recipe {
  title: string
  cuisine: string
  cook_time_minutes: number
  difficulty: string
  uses_expiring: string[]
  ingredients_used: Array<{ name: string; amount: string }>
  ingredients_missing: Array<{ name: string; amount: string; optional: boolean }>
  steps: string[]
  why_this_recipe: string
}

interface AIResult {
  detected_ingredients: DetectedIngredient[]
  recipes: Recipe[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToBase64(bytes: Uint8Array): string {
  // btoa can't take a Uint8Array directly; build a binary string in chunks
  // to avoid call-stack limits on large images.
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function buildUserMessage(
  skill: string | null,
  cuisines: string[],
  dietary: string[],
  additional: string[],
  removed: string[],
): string {
  const lines = [
    'User profile:',
    `- Skill level: ${skill ?? 'intermediate'}`,
    `- Preferred cuisines: ${cuisines.length ? cuisines.join(', ') : 'no preference'}`,
    `- Dietary filters: ${dietary.length ? dietary.join(', ') : 'none'}`,
  ]
  if (additional.length) lines.push(`- User-added ingredients: ${additional.join(', ')}`)
  if (removed.length) lines.push(`- Ignore these (user removed them): ${removed.join(', ')}`)
  lines.push('', 'Analyze the attached image and generate recipes.')
  return lines.join('\n')
}

function parseAIResponse(text: string): AIResult | null {
  try {
    return JSON.parse(text) as AIResult
  } catch {
    // Sometimes models wrap output in ```json fences despite instructions.
    // Strip a single fenced block and retry once before giving up.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1]) as AIResult
      } catch {
        return null
      }
    }
    return null
  }
}

function tokensToCents(inputTokens: number, outputTokens: number): number {
  const dollars =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK
  return Math.ceil(dollars * 100)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'missing_authorization' }, 401)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_json_body' }, 400)
  }

  const { scan_id, source, additional_ingredients = [], removed_ingredients = [] } = body
  if (!scan_id || typeof scan_id !== 'string') {
    return jsonResponse({ error: 'missing_scan_id' }, 400)
  }

  // Anon-key client carries the user's JWT — RLS scopes everything to them.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  // Service-role client for the private storage bucket and for usage-counter
  // updates that need to bypass RLS write policies.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Identify the caller.
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) {
    return jsonResponse({ error: 'invalid_token' }, 401)
  }
  const userId = authData.user.id
  const isAnonymous = authData.user.is_anonymous === true

  // 2. Load the scan; RLS guarantees ownership.
  const { data: scan, error: scanError } = await userClient
    .from('scans')
    .select('id, user_id, image_path, recipes, cache_key, created_at')
    .eq('id', scan_id)
    .single()

  if (scanError || !scan) {
    return jsonResponse({ error: 'scan_not_found' }, 404)
  }

  // Regeneration = the scan already has recipes. The user is editing
  // ingredients and asking for a new pass. Two implications:
  //   - Skip the cache (cache_key doesn't include ingredient edits, so a
  //     hit would just return the original recipes and defeat the regen).
  //   - Don't bump scan_count_week — that quota is per-photo, not per-AI-call.
  const isRegeneration = scan.recipes !== null

  // 3. Load profile for prompt context + scan-limit check.
  const { data: profile, error: profileError } = await userClient
    .from('users')
    .select(
      'skill_level, preferred_cuisines, dietary_filters, scan_count_week, scan_count_lifetime, scan_week_resets_at, subscription_tier',
    )
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return jsonResponse({ error: 'profile_not_found' }, 404)
  }

  const skill: string | null = profile.skill_level ?? null
  const cuisines: string[] = profile.preferred_cuisines ?? []
  const dietary: string[] = profile.dietary_filters ?? []
  const tier: string = profile.subscription_tier ?? 'free'

  // 4. Free-tier scan limit. Reset window if it elapsed.
  const now = new Date()
  const resetsAt = profile.scan_week_resets_at ? new Date(profile.scan_week_resets_at) : null
  const windowExpired = !resetsAt || resetsAt <= now
  const effectiveCount = windowExpired ? 0 : (profile.scan_count_week ?? 0)

  const scanLimit = isAnonymous ? ANONYMOUS_SCAN_LIMIT : FREE_SCAN_LIMIT

  const isOnboardingScan = source === 'onboarding' && isAnonymous

  if (tier === 'free' && !isRegeneration && !isOnboardingScan && effectiveCount >= scanLimit) {
    return jsonResponse({ error: 'scan_limit_reached' }, 402)
  }

  // 5. Cache key + cache lookup. Regenerations bypass — the user explicitly
  // wants a new pass on edited ingredients.
  const cacheKey = await sha256Hex(
    [scan.image_path, skill ?? '', cuisines.join(','), dietary.join(',')].join('|'),
  )

  const cacheCutoff = new Date(now.getTime() - CACHE_WINDOW_MINUTES * 60_000).toISOString()
  const { data: cached } = isRegeneration
    ? { data: null }
    : await userClient
        .from('scans')
        .select('detected_ingredients, recipes')
        .eq('user_id', userId)
        .eq('cache_key', cacheKey)
        .not('recipes', 'is', null)
        .gte('created_at', cacheCutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

  if (cached?.recipes) {
    // Backfill the cache hit onto this scan row so the client only needs to
    // refetch one record. No cost, no latency, no counter increment.
    await userClient
      .from('scans')
      .update({
        detected_ingredients: cached.detected_ingredients,
        recipes: cached.recipes,
        cache_key: cacheKey,
        api_cost_cents: 0,
        api_latency_ms: 0,
        model_used: MODEL,
      })
      .eq('id', scan_id)

    return jsonResponse({
      scan_id,
      detected_ingredients: cached.detected_ingredients,
      recipes: cached.recipes,
      cached: true,
    })
  }

  // 6. Download the image (private bucket → service role).
  const { data: imageBlob, error: downloadError } = await adminClient.storage
    .from('scan-images')
    .download(scan.image_path)

  if (downloadError || !imageBlob) {
    console.error('Image download failed:', downloadError)
    return jsonResponse({ error: 'image_download_failed' }, 500)
  }

  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer())
  const imageBase64 = bytesToBase64(imageBytes)
  const mediaType = imageBlob.type || 'image/jpeg'

  // 7. Call Anthropic. One JSON-parse retry before bailing.
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  const userMessage = buildUserMessage(
    skill,
    cuisines,
    dietary,
    additional_ingredients,
    removed_ingredients,
  )

  const startedAt = Date.now()
  let result: AIResult | null = null
  let inputTokens = 0
  let outputTokens = 0
  let lastRawText = ''

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                  data: imageBase64,
                },
              },
              { type: 'text', text: userMessage },
            ],
          },
        ],
      })

      inputTokens = completion.usage.input_tokens
      outputTokens = completion.usage.output_tokens

      const textBlock = completion.content.find((c) => c.type === 'text')
      lastRawText = textBlock && textBlock.type === 'text' ? textBlock.text : ''

      const parsed = parseAIResponse(lastRawText)
      if (parsed && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
        result = parsed
        break
      }
      console.warn(`AI response parse failed on attempt ${attempt + 1}`)
    } catch (err) {
      console.error(`Anthropic call failed on attempt ${attempt + 1}:`, err)
      if (attempt === 1) {
        return jsonResponse({ error: 'ai_call_failed' }, 502)
      }
    }
  }

  const latencyMs = Date.now() - startedAt

  if (!result) {
    return jsonResponse({ error: 'ai_response_unparseable', raw: lastRawText.slice(0, 500) }, 502)
  }

  // 8. Persist results onto the scan row.
  const expiringCount = result.detected_ingredients.filter((i) => i.expiring_soon).length
  const costCents = tokensToCents(inputTokens, outputTokens)

  const { error: updateError } = await userClient
    .from('scans')
    .update({
      detected_ingredients: result.detected_ingredients,
      recipes: result.recipes,
      expiring_count: expiringCount,
      api_latency_ms: latencyMs,
      api_cost_cents: costCents,
      model_used: MODEL,
      cache_key: cacheKey,
    })
    .eq('id', scan_id)

  if (updateError) {
    console.error('Scan update failed:', updateError)
    return jsonResponse({ error: 'scan_update_failed' }, 500)
  }

  // 9. Bump the weekly + lifetime scan counters — but only on the first AI
  // pass per photo. Regenerations don't burn quota. Use the admin client so
  // RLS update policies (which forbid editing usage fields directly) don't
  // block this. scan_count_lifetime backs the Week 3 soft-prompt and
  // interstitial cadence (every 2nd lifetime scan).
  if (!isRegeneration) {
    const newResetsAt = windowExpired
      ? new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString()
      : profile.scan_week_resets_at
    const newCount = effectiveCount + 1
    const newLifetimeCount = (profile.scan_count_lifetime ?? 0) + 1

    await adminClient
      .from('users')
      .update({
        scan_count_week: newCount,
        scan_count_lifetime: newLifetimeCount,
        scan_week_resets_at: newResetsAt,
        last_active_at: now.toISOString(),
      })
      .eq('id', userId)
  } else {
    await adminClient
      .from('users')
      .update({ last_active_at: now.toISOString() })
      .eq('id', userId)
  }

  // 10. Pantry auto-population for Plus users. Best-effort: a failure here
  // must never fail the function — the user already has their recipes.
  // Skipped for free users (no pantry surface) and for regenerations (the
  // pantry already reflects the original scan; ingredient edits don't
  // change what was actually in the fridge).
  if (tier === 'plus' && !isRegeneration && result.detected_ingredients.length > 0) {
    try {
      const seen = new Set<string>()
      const rows: Array<{
        user_id: string
        ingredient_name: string
        quantity_estimate: string | null
        added_via: 'scan'
        scan_id: string
      }> = []
      for (const ing of result.detected_ingredients) {
        const name = String(ing.name ?? '').toLowerCase().trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        rows.push({
          user_id: userId,
          ingredient_name: name,
          quantity_estimate: ing.quantity_estimate ?? null,
          added_via: 'scan',
          scan_id: scan_id,
        })
      }
      if (rows.length > 0) {
        const { error: pantryErr } = await adminClient
          .from('pantry_items')
          .upsert(rows, { onConflict: 'user_id,ingredient_name', ignoreDuplicates: false })
        if (pantryErr) {
          console.warn('pantry_items upsert failed:', pantryErr.message)
        }
      }
    } catch (err) {
      console.warn('pantry_items upsert threw:', err)
    }
  }

  return jsonResponse({
    scan_id,
    detected_ingredients: result.detected_ingredients,
    recipes: result.recipes,
    cached: false,
  })
})
