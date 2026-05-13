// Cookable — revenuecat-webhook Edge Function
//
// Receives RevenueCat webhook events and keeps public.users.subscription_*
// in sync. This is the authoritative writer for subscription state.
//
// Auth: shared-secret in Authorization: Bearer <secret> header.
// Set the secret via: npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<32-byte hex>
// Configure the same secret in RevenueCat → Project Settings → Webhooks.
//
// Deploy: npx supabase functions deploy revenuecat-webhook --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// Maps a RevenueCat event type + period_type to our subscription_status value.
function resolveStatus(eventType: string, periodType?: string): string {
  switch (eventType) {
    case 'TRIAL_STARTED':
      return 'trialing'
    case 'TRIAL_CONVERTED':
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      return periodType === 'TRIAL' ? 'trialing' : 'active'
    case 'CANCELLATION':
    case 'TRIAL_CANCELLED':
      // Entitlement stays active until expiration_at_ms; mark as cancelled
      // so the profile screen can optionally surface a "subscription ends" notice.
      return 'cancelled'
    case 'BILLING_ISSUE':
      return 'billing_issue'
    case 'EXPIRATION':
    default:
      return 'inactive'
  }
}

// Whether the entitlement is still live at the time of this event.
// EXPIRATION means it's fully gone. Everything else has an expiration in the future.
function isTierActive(eventType: string): boolean {
  return eventType !== 'EXPIRATION'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  // Verify shared secret.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const event = payload?.event
  if (!event) {
    return jsonResponse({ error: 'missing_event' }, 400)
  }

  const {
    type: eventType,
    app_user_id: appUserId,
    product_id: productId,
    period_type: periodType,
    expiration_at_ms: expirationAtMs,
    purchased_at_ms: purchasedAtMs,
    environment,
  } = event

  if (!eventType || !appUserId) {
    return jsonResponse({ error: 'missing_required_event_fields' }, 400)
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Look up the user by app_user_id (which equals auth.uid because we call
  // Purchases.logIn(userId) on the client).
  const { data: userData, error: userError } = await admin
    .from('users')
    .select('id')
    .eq('id', appUserId)
    .maybeSingle()

  if (userError) {
    console.error('webhook: user lookup failed:', userError.message)
    return jsonResponse({ error: 'user_lookup_failed' }, 500)
  }

  if (!userData) {
    // Unknown user — could be a test event from the RC dashboard with a
    // fabricated app_user_id. Log and return 200 so RC doesn't retry.
    console.warn('webhook: no user found for app_user_id:', appUserId)
    return jsonResponse({ ok: true, note: 'user_not_found' })
  }

  const status = resolveStatus(eventType, periodType)
  const tier = isTierActive(eventType) ? 'plus' : 'free'
  const expiresAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null
  const trialEndsAt = status === 'trialing' ? expiresAt : null

  // Upsert subscription state onto the users row.
  const { error: updateError } = await admin
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_expires_at: expiresAt,
      trial_ends_at: trialEndsAt,
    })
    .eq('id', appUserId)

  if (updateError) {
    console.error('webhook: users update failed:', updateError.message)
    return jsonResponse({ error: 'users_update_failed' }, 500)
  }

  // Append to subscription_events log.
  const { error: insertError } = await admin
    .from('subscription_events')
    .insert({
      user_id: appUserId,
      event_type: eventType,
      product_id: productId ?? null,
      environment: environment ?? null,
      raw_payload: payload,
      processed_at: new Date().toISOString(),
    })

  if (insertError) {
    // Non-fatal — the users row is already updated. Log and continue.
    console.warn('webhook: subscription_events insert failed:', insertError.message)
  }

  return jsonResponse({ ok: true })
})
