# Plan: Week 2 — Core Magic (Days 8-14)

**Created:** 2026-05-06
**Status:** Draft — ready to implement
**Request:** Build the Anthropic integration, recipe results flow, editable ingredient list, save/favorite, and profile completion
**Relevant knowledge docs:** 04-build-plan.md, 07-ai-prompt-spec.md, 06-database-schema.md, 10-microcopy.md, 03-mvp-scope.md

---

## Overview

This is the most important week of the build. The camera flow already uploads images to Supabase Storage. Week 2 completes the loop: image → Anthropic Edge Function → detected ingredients + 3 recipes → results screen → save. By end of Day 14, a user can snap a photo and actually cook dinner from it.

The "editable ingredient list" (Day 11) is non-negotiable — it's the safety net when AI gets something wrong, and it's explicitly called out as such in the build plan.

## Current State

- Camera: captures, resizes, uploads image to Supabase Storage, inserts `scans` row ✓ (pending real credentials)
- `scans` row exists but `detected_ingredients`, `recipes`, `api_cost_cents` are all null post-upload ✓ (expected)
- `saved_recipes` table exists; `app/(tabs)/recipes.tsx` is a placeholder stub
- Profile screen shows name + sign-out; no skill/cuisine/dietary editing yet
- Anthropic API key in hand; not yet deployed to Supabase Edge Function secrets

## Week 1 Carry-Forwards

These deferred items from audit don't block Week 2 but are on the watch list:
- Centralize `useUser` into a `UserProvider` context (4× duplicated listeners) — if profiler shows excessive re-renders during recipe load, do it then
- Loading state hides auth buttons instead of disabling them — Week 4 polish
- Library-picker denial UX — Week 4 polish
- Tabs `paddingBottom` hardcoded — Week 4 polish

## Prerequisites Before Day 8 Code Can Be Tested

1. Supabase project live — run `001_initial_schema.sql` + `002_storage.sql`, create `scan-images` + `avatars` buckets, create `.env.local`
2. Supabase CLI installed locally (`npm install -g supabase` or `brew install supabase/tap/supabase`)
3. `supabase link --project-ref <project-ref>` run from `app/`
4. Anthropic API key added to Supabase secrets: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
5. At least one working auth method (Google via Supabase OAuth, or Apple with Dev account) so we can get a valid JWT to hit the Edge Function

---

## Proposed Changes

### Day 8-10 — Anthropic Edge Function + scan results flow

Build a Supabase Edge Function (Deno) that receives a `scan_id`, fetches the image from Supabase Storage, calls Anthropic with vision, and writes results back to the `scans` row. Wire the camera screen to call it after upload. Build the skeleton results screen.

### Day 11-12 — Editable ingredient list + recipe detail

Build the ingredient editor (the critical AI error safety net) and the full recipe detail screen. The editor pre-populates from `detected_ingredients`, lets the user add/remove items, and triggers a regeneration call.

### Day 13-14 — Save/favorite + profile completion

Wire the `saved_recipes` table insert from recipe cards and the detail screen. Update the Recipes tab to pull real data. Complete the Profile screen with skill, cuisine, and dietary preference editing — these fields feed the Anthropic user message template and matter from first scan.

---

## Design Decisions

**Edge Function, not a direct client-side Anthropic call:** The API key must never live in the Expo bundle — it's extractable. All AI calls go through a Supabase Edge Function (Deno). The function verifies the user's JWT, fetches the image using the service role key (private bucket), calls Anthropic, and writes results to the DB.

**Pass `scan_id` to Edge Function, not the image:** The client already uploaded the image in Week 1. The Edge Function downloads from Storage using the service role key and converts to base64. This avoids double-sending the image over the wire.

**Model: `claude-sonnet-4-6` (not 4.5):** The knowledge doc specifies `claude-sonnet-4-5` but the current available model is `claude-sonnet-4-6`. Use `claude-sonnet-4-6` — same capability tier, current release. Update `scans.model_used` default via a `003_model_version.sql` migration.

**Cache key = SHA-256 of `image_path + skill + cuisines.join(',') + dietary.join(',')`:** Hash is computed in the Edge Function before calling Anthropic. If a scan with the same `cache_key` and non-null `recipes` exists for the user within 10 minutes, return it immediately. This matches the spec in `07-ai-prompt-spec.md`.

**Navigation pattern for results:** Expo Router dynamic route `app/scan/[id].tsx`. After camera uploads + Edge Function call, navigate to `/scan/{scan_id}`. The results screen fetches the scan record from Supabase (already written by the Edge Function). This keeps navigation state clean and enables direct linking to a past scan later.

**Regeneration after editing:** When the user edits ingredients and taps "Regenerate", call the Edge Function again with `{ scan_id, additional_ingredients, removed_ingredients }`. The function builds a modified ingredient list and calls Anthropic again. The new result overwrites the `scans` row (this scan is still in-flight, not saved).

**Saved recipes are a snapshot:** `saved_recipes` captures the full recipe JSON at save time. The source `scans` row can be deleted without losing the saved recipe. This matches the schema design.

**Scan limit check on client:** Before calling the Edge Function, check `users.scan_count_week` client-side. If >= 3, show the upgrade prompt (paywall stub — full paywall is Week 3). The Edge Function also enforces this server-side as a guard, but client-side gives an instant response.

**Profile fields feed the AI from first use:** Skill level, preferred cuisines, and dietary filters are in `public.users` and are sent in the Anthropic user message template on every scan. Profile completion should happen during onboarding (Week 4), but the Profile screen edit UI is built this week so they can be set manually during development and beta.

---

## Open Questions

1. **Regeneration UX:** Should "Regenerate" replace all 3 recipes or only re-rank/filter the existing ones? Spec says a new Anthropic call, so replace. If latency is an issue (>5s), consider showing a "Thinking..." state with partial streaming — but shipping batch first is correct.
2. **Ingredient editor as modal or full screen?** Modal (bottom sheet) keeps context — user can see the recipe cards behind it and immediately see them update. Recommend modal; can be full screen on small devices.
3. **Where does the Supabase CLI live?** If Justin doesn't have it installed, Day 8 begins with install + link. Flag this at session start.

---

## Step-by-Step Tasks

### Day 8 — Edge Function

1. Confirm Supabase CLI installed: `supabase --version`
2. From `app/`: `supabase link --project-ref <project-ref>` (get project ref from Supabase Dashboard → Settings → General)
3. Add Anthropic secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
4. Create `app/supabase/functions/generate-recipes/index.ts`:
   - Accept POST with JSON body `{ scan_id: string, additional_ingredients?: string[], removed_ingredients?: string[] }`
   - Verify auth via `createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') } } })`
   - Fetch the scan row (confirm it belongs to the authed user)
   - Fetch user profile (skill_level, preferred_cuisines, dietary_filters)
   - Check scan limit: if `scan_count_week >= 3` return `{ error: 'scan_limit_reached' }`
   - Compute cache key: `SHA-256(image_path + skill + cuisines + dietary)` — use `crypto.subtle.digest`
   - Check for cached result: query `scans` for same `cache_key`, `user_id`, and `created_at > now() - interval '10 minutes'` with non-null `recipes`; if found, return it
   - Download image using service role client: `supabase.storage.from('scan-images').download(image_path)`
   - Convert to base64 (ArrayBuffer → Uint8Array → base64 string)
   - Build system prompt (verbatim from `07-ai-prompt-spec.md`)
   - Build user message (verbatim from `07-ai-prompt-spec.md`; apply `additional_ingredients` / `removed_ingredients` overrides)
   - Call `anthropic.messages.create` with model `claude-sonnet-4-6`, max_tokens 4096, image as base64 source, JSON instruction in system prompt
   - Record latency: `Date.now() - startTime`
   - Parse JSON response — retry once if JSON parse fails
   - Estimate cost: input_tokens × $3/1M + output_tokens × $15/1M; store as cents integer
   - Update `scans` row: `detected_ingredients`, `recipes`, `expiring_count`, `api_latency_ms`, `api_cost_cents`, `model_used`, `cache_key`
   - Increment `users.scan_count_week` (reset `scan_week_resets_at` to `now() + interval '7 days'` if null or in the past)
   - Return `{ detected_ingredients, recipes, scan_id }`
5. Add `app/supabase/functions/generate-recipes/deno.json` with the `npm:@anthropic-ai/sdk` import specifier
6. Local test: `supabase functions serve generate-recipes` — use `curl` with a valid JWT + existing scan_id from the bucket

### Day 9 — Wire camera → Edge Function → results screen skeleton

7. In `app/app/(tabs)/camera.tsx`: after `scans` insert succeeds, call the Edge Function via `supabase.functions.invoke('generate-recipes', { body: { scan_id } })`
8. Add loading state between upload and results: show "Reading your fridge..." (from microcopy doc) with a subtle animated indicator. Keep the green upload success state visible briefly before transitioning.
9. Handle Edge Function error cases:
   - `scan_limit_reached` → show scan limit modal (placeholder for Week 3 paywall)
   - Network / parse error → show retry option; second failure shows "We had trouble reading your fridge — add a few items manually" and still navigates to results with raw `detected_ingredients`
   - Low-confidence fallback: if >50% of `detected_ingredients` have `confidence: "low"`, surface the "We had trouble seeing your fridge clearly" copy (from microcopy doc) as a banner on the results screen
10. On success: navigate to `/scan/{scan_id}` via `router.push`
11. Create `app/app/scan/_layout.tsx` for the scan stack (if needed by Expo Router)
12. Create `app/app/scan/[id].tsx`:
    - On mount: fetch scan record from Supabase using `scan_id` from route params (results are already written by the Edge Function)
    - Show skeleton loader while fetching
    - Top section: ingredient summary (count, expiring-soon count with amber flag)
    - Bottom section: 3 recipe cards in a vertical scroll (title, cuisine, cook time, difficulty badge, "uses expiring" tag if applicable)
    - "Edit ingredients" button at top → ingredient editor (Day 11)

### Day 10 — Results screen polish + error handling

13. Recipe card component `components/RecipeCard.tsx`: title (Fraunces 22pt), cuisine + cook time row (Inter 14pt), difficulty badge, expiring ingredients callout (amber), tap → navigate to detail
14. Expiring-soon badge: amber `#E89B3C` pill, "Uses expiring items" copy, appears on card and in detail
15. Handle navigation back from results → camera cleanly (pop, don't push)
16. If Edge Function returned low-confidence ingredients, show banner: "We had trouble seeing your fridge clearly — add a few items manually" with a button that opens the ingredient editor directly
17. Confirm the full camera → upload → Edge Function → results round trip works end-to-end (requires live Supabase + real device or iOS simulator with camera mock)

### Day 11 — Editable ingredient list

18. Create `components/IngredientEditor.tsx` as a bottom sheet modal:
    - Pre-populate from `detected_ingredients` (name + quantity_estimate + expiring_soon)
    - Each row: ingredient name, quantity estimate (editable inline), expiring-soon toggle (amber dot), delete button (swipe-to-dismiss or trash icon)
    - "Add ingredient" row at bottom with text input: tap → keyboard appears, type name, press enter to add
    - "Regenerate recipes" CTA button (disabled if no changes made)
    - "Done" button to dismiss without regenerating
19. Wire "Regenerate" to call Edge Function again: pass `additional_ingredients` (newly added items) and `removed_ingredients` (deleted items from original list)
20. After regeneration: dismiss editor, update results screen with new `detected_ingredients` + `recipes`
21. Show loading state during regeneration ("Updating your recipes...")
22. Expiring-soon items highlighted in the editor with amber left border

### Day 12 — Recipe detail screen

23. Create `app/app/scan/[id]/recipe/[index].tsx`:
    - Header: recipe title (Fraunces 28pt), subtitle row: cuisine · cook time · difficulty
    - Expiring-soon callout if `uses_expiring` is non-empty: amber card "This recipe uses your soon-to-expire items"
    - `why_this_recipe` in a Forest Pine quote-style callout
    - "Ingredients you have" section: green checkmark list
    - "You'll also need" section: plain list (optional items marked "(optional)")
    - Step-by-step instructions: numbered list, Inter 16pt, generous line height
    - Save button (heart icon) in header right — triggers Day 13 save logic
24. Handle navigation: back arrow to results, not to camera (respect the stack)
25. Ensure scroll behavior is correct on both iOS (rubber banding) and Android

### Day 13 — Save/favorite

26. Add save/heart button to `RecipeCard.tsx` (recipe card in results screen)
27. Save logic in `hooks/useSaveRecipe.ts`:
    - Check `users.saved_recipe_count >= 5` for free tier → show upgrade modal (soft paywall stub; full paywall Week 3)
    - Insert into `saved_recipes` with full snapshot fields from the recipe JSON
    - Increment `users.saved_recipe_count`
    - Optimistic UI: heart fills immediately; revert on DB error with toast
28. Update `app/app/(tabs)/recipes.tsx` to actually fetch `saved_recipes` from Supabase:
    - Order by `created_at desc`, exclude `deleted_at IS NOT NULL`
    - Show recipe cards (reuse `RecipeCard` component, adapted for saved context)
    - Empty state: "Nothing saved yet — snap a photo to get started" (on-voice copy)
    - Tap → navigate to recipe detail (pass the saved recipe JSON; no scan_id needed since it's a snapshot)
29. Create `app/app/saved/[id].tsx` for viewing a saved recipe (same layout as `scan/[id]/recipe/[index].tsx`, sourced from `saved_recipes` row instead of scan)
30. Delete saved recipe: swipe-to-delete or long-press → confirmation → soft-delete (`deleted_at = now()`) + decrement `saved_recipe_count`

### Day 14 — Profile screen + retro

31. Update `app/app/(tabs)/profile.tsx` with real editing:
    - Skill level selector: "Beginner", "Intermediate", "Confident" — radio-style selection tiles
    - Preferred cuisines multi-select: pill tags (Italian, Asian, Mexican, Mediterranean, American, etc.) — tap to toggle, max 5
    - Dietary filters multi-select: Vegetarian, Vegan, Gluten-free, Dairy-free, Halal, Kosher — pill tags
    - Save changes button → upsert `public.users` (skill_level, preferred_cuisines, dietary_filters)
    - Show optimistic update + success toast
32. Add scan counter indicator: "X of 3 scans used this week" progress bar (free tier); hidden for Plus
33. Update `notes/journal.md` with Week 2 retro
34. Update `CLAUDE.md` "Build State" — Day 14 of 30, Week 2 complete

---

## New Files

```
app/app/scan/
  _layout.tsx                    — stack navigator wrapper for scan screens
  [id].tsx                       — results screen (3 recipe cards + ingredient summary)
  [id]/recipe/[index].tsx        — individual recipe detail

app/app/saved/
  [id].tsx                       — view a saved recipe from the Saved tab

app/components/
  RecipeCard.tsx                 — recipe card (used in results + saved list)
  IngredientEditor.tsx           — bottom sheet ingredient editor

app/hooks/
  useSaveRecipe.ts               — save logic with free-tier guard

app/supabase/functions/generate-recipes/
  index.ts                       — Deno Edge Function
  deno.json                      — import map (npm:@anthropic-ai/sdk)

app/supabase/migrations/
  003_model_version.sql          — update scans.model_used default to 'claude-sonnet-4-6'
```

## Modified Files

```
app/app/(tabs)/camera.tsx        — add Edge Function call + loading state + navigation to results
app/app/(tabs)/recipes.tsx       — replace stub with real saved_recipes fetch
app/app/(tabs)/profile.tsx       — add skill/cuisine/dietary editing + scan counter
```

---

## Testing Plan

- iOS simulator: full flow — sign in → camera → upload → Edge Function → results (3 recipe cards) → tap recipe → detail → save → Saved tab shows it
- Android emulator: same flow; confirm keyboard behavior in ingredient editor
- Real device (iOS): camera permissions, non-zero bytes in Supabase bucket, EXIF rotation (portrait photo shouldn't be sideways in results)
- Edge Function: test locally with `supabase functions serve` before deploying
- Cache: scan twice with same image within 10 minutes; second call should not hit Anthropic (verify via `api_cost_cents` null or same as first)
- Scan limit: manually set `scan_count_week = 3` in Supabase dashboard → scan again → confirm limit modal appears
- Free tier save limit: save 5 recipes → try to save a 6th → confirm upgrade modal appears
- Regeneration: delete an ingredient, add a new one, tap Regenerate → confirm 3 new recipes appear

---

## Validation Checklist

- [ ] Edge Function deploys and responds with valid JSON for a real scan
- [ ] Camera → upload → Edge Function → results round trip works end-to-end
- [ ] Editable ingredient list: add and remove items, then regenerate
- [ ] Recipe detail shows all fields: title, cuisine, cook time, difficulty, steps, ingredients used/missing, why_this_recipe
- [ ] Save recipe works; appears in Saved tab
- [ ] Delete saved recipe works
- [ ] Profile edits (skill, cuisines, dietary) persist and are used in next scan's Anthropic call
- [ ] Scan limit (3/week) enforced client-side and server-side
- [ ] Free tier save limit (5 recipes) enforced with upgrade prompt
- [ ] Low-confidence fallback banner appears when >50% ingredients are low-confidence
- [ ] Cache: second identical scan within 10 minutes does not re-call Anthropic
- [ ] `notes/journal.md` updated
- [ ] `CLAUDE.md` "Build State" reflects Day 14 of 30

---

## Success Criteria

A user can snap a photo, see 3 recipes, edit the ingredient list if needed, regenerate, tap into a recipe for step-by-step instructions, and save it. The Saved tab persists those recipes. The Profile screen has working skill/cuisine/dietary editing that visibly changes future scan results.

By end of Day 14: the core magic loop — Camera → AI → Recipes — is fully functional. Week 3 (monetization) can begin clean.
