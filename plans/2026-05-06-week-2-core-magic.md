# Plan: Week 2 — Core Magic (Days 8-14)

**Created:** 2026-05-06
**Status:** Days 8-14 implemented — Week 2 complete (2026-05-07)
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

---

## Implementation Notes

### 2026-05-06 — Day 8 (Edge Function)

**Done in code:**
- `app/supabase/functions/generate-recipes/index.ts` — full Deno Edge Function. Handles JWT auth, scan ownership check, profile load, free-tier scan-limit check (3 / rolling 7 days), SHA-256 cache key, 10-minute cache lookup, private-bucket image download via service role, base64 encoding, Claude Sonnet 4.6 vision call, single JSON-parse retry (with fenced-block fallback), cost calc in cents ($3/MTok in, $15/MTok out), result persistence, weekly counter increment.
- `app/supabase/functions/generate-recipes/deno.json` — import map for `@anthropic-ai/sdk` (npm:0.32.1) and `@supabase/supabase-js` (esm.sh:2.45.4).
- `app/supabase/migrations/003_model_version.sql` — flips `scans.model_used` default from `claude-sonnet-4-5` to `claude-sonnet-4-6`.

**Deviations from plan:**
- Plan step 4 said "increment `users.scan_count_week`" — did this via the service-role client rather than the user-scoped client. Functionally identical (RLS would allow either) but service-role is the convention for usage counters and survives any future tightening of the user update policy.
- Cache hit also backfills the `scans` row with the cached recipes (cost = 0, latency = 0) so the client can refetch by `scan_id` without a separate cache-API. Returns `cached: true` in the response so callers can skip re-rendering animations if needed.
- Added a `removed_ingredients` line to the user message (plan only mentioned `additional_ingredients` for the prompt, but Day 11 regeneration needs both passed through to give the model the full picture).

**Manual steps completed by Justin:**
- Installed Supabase CLI as a local devDep: `npm install supabase --save-dev` (run from `app/`; global install is deprecated by Supabase, use `npx supabase ...`).
- `npx supabase login`, `npx supabase link --project-ref sikgphwzecfkcgnvauqp`, `npx supabase secrets set ANTHROPIC_API_KEY=...`.
- `npx supabase migration repair --status applied 001 002` to stamp the manually-run Week 1 migrations, then `npx supabase db push` applied migration 003.
- `npx supabase functions deploy generate-recipes` deployed cleanly. Local `supabase functions serve` skipped — needs Docker Desktop, not worth the install for a one-shot validation.

**Smoke test deferred to Day 9:** Curl-from-terminal needs a real user JWT (Supabase platform-level JWT verify is on by default). The first end-to-end test of Day 9 — camera → upload → `supabase.functions.invoke('generate-recipes')` → results — doubles as the smoke test, with no signal lost.

**Open issues to confirm during Day 9:**
- Anthropic SDK version 0.32.1 supports `claude-sonnet-4-6` — verify with a real call; bump SDK if the model string isn't accepted.
- `npm:` specifiers on Supabase Edge Runtime sometimes need a one-time cold-start. If first invocation times out, retry once before treating it as a real error.

**Day 8 status:** ✅ Complete.

### 2026-05-06 — Day 9 (camera → Edge Function → results skeleton)

**Done in code:**
- `app/app/(tabs)/camera.tsx` — added a new `analyzing` screen state. After the storage upload + `scans` insert succeed, the screen calls `supabase.functions.invoke('generate-recipes', { body: { scan_id } })`. The "Looking at your fridge…" copy (verbatim from `knowledge/10-microcopy.md`) is shown over the captured image while the function runs. Auth header is sent automatically by `functions.invoke` because the user is signed in.
- Error handling: `scan_limit_reached` (parsed out of `FunctionsHttpError.context`) routes to a stub limit screen using the microcopy doc's exact line ("You've used your 3 free scans this week. Resets Sunday — or unlock unlimited with Plus."). The full paywall lands in Week 3. Network/parse errors retry once, then navigate to `/scan/{scan_id}?fallback=1` so the user can edit ingredients manually rather than getting stuck on an error screen.
- On success: `router.push('/scan/{scan_id}')` and the camera resets to the viewfinder so coming back is clean.
- `app/app/scan/_layout.tsx` — minimal Expo Router stack with brand header styling.
- `app/app/scan/[id].tsx` — results screen skeleton. On mount it fetches the scan row by id (results were already written by the Edge Function); shows a skeleton loader during the fetch; renders the ingredient summary (count + amber-flagged expiring count) with an "Edit ingredients" button (Day 11 wires the editor); renders an inline rough recipe card per recipe (title in Fraunces, cuisine · cook time · difficulty badge, "Uses expiring items" tag if applicable). Pull-to-refresh is included so post-fallback edits or late writes can be picked up.
- Banners: low-confidence detection (>50% of `detected_ingredients` with `confidence: "low"`) uses the verbatim "Hmm — let's double-check what's in there…" copy. The fallback banner uses "We had trouble reading your fridge — add a few items manually." and shows when the camera arrived with `?fallback=1` or when the scan row has no recipes.
- `app/app/_layout.tsx` — registered `<Stack.Screen name="scan" />` with the root stack so the route group is explicitly known to the navigator.

**Deviations from plan:**
- Plan step 8 said "Reading your fridge…" — used the microcopy doc's "Looking at your fridge…" instead, per the user's flagged correction. Microcopy doc is authoritative.
- Plan step 11 noted the scan stack was "if needed" — added it anyway for header styling consistency and a clean place to mount the future recipe-detail child route.
- Removed the pre-existing `'success'` screen state from `camera.tsx`. Day 8's "Photo saved — recipe generation coming in Week 2" is obsolete now that we navigate straight to results.
- For the fallback path the camera passes a `?fallback=1` query param rather than a flag in route params — keeps the route shape stable and the results screen still defends against missing data on its own.
- Recipe card kept inline (not lifted to `components/RecipeCard.tsx`) per plan note that the polished component is Day 10.

**Verified locally:**
- `npx tsc --noEmit` — no errors introduced by Day 9 files. The remaining errors are pre-existing: Deno globals in the Edge Function (which isn't part of the app's TS scope) and one stale `@ts-expect-error` in `ExternalLink.tsx`.

**Open issues to confirm during real-device test:**
- First end-to-end invocation also serves as the Day 8 Edge Function smoke test. If a 401 surfaces, confirm the Expo client has a live session — `functions.invoke` only attaches the JWT when `supabase.auth.getSession()` returns one.
- `npm:@anthropic-ai/sdk` cold start on Supabase Edge Runtime can time out on first call. The retry-once logic on the client masks one slow boot; if it still fails, tail `supabase functions logs generate-recipes`.
- The pull-to-refresh on the results screen is the manual workaround if the Edge Function call resolved client-side but the DB write was still in flight.

**Day 9 status:** ✅ Complete (pending live device smoke test).

### 2026-05-07 — Day 10 (results polish + RecipeCard component)

**Done in code:**
- `app/components/RecipeCard.tsx` — lifted from the inline `RecipeCardRough` in `scan/[id].tsx`. Uses `Pressable` for the tap target with subtle press feedback. Title bumped from 18pt to **Fraunces_700Bold 22pt** (28pt line-height) per the polished spec. Cuisine · cook time row in **Inter_400Regular 14pt**. Difficulty pill keeps the small badge style with `textTransform: 'capitalize'`. Expiring callout is now an amber `#FBE9CE` pill with the saffron dot and `Inter_600SemiBold 12pt` "Uses expiring items" copy (exported as `EXPIRING_PILL_COPY` so the Day 12 detail screen can mirror it verbatim). Tapping the card calls `router.push('/scan/{scanId}/recipe/{index}')`.
- `app/app/scan/[id]/recipe/[index].tsx` — placeholder detail screen so Day 10 doesn't navigate to a 404. Loads the scan, picks the recipe at the requested index, renders title (Fraunces 28pt) + "Detail screen lands Day 12." line. Day 12 (plan steps 23-25) replaces this with the full layout (subtitle row, ingredients used / missing, steps, why_this_recipe, save button, etc.).
- `app/app/scan/_layout.tsx` — registered `<Stack.Screen name="[id]/recipe/[index]" options={{ title: 'Recipe' }} />` for header consistency. Auto-discovery would have worked, but explicit registration keeps the header style centralized.
- `app/app/scan/[id].tsx` — replaced inline `RecipeCardRough` with the lifted component. `SkeletonResults` and `Banner` stay inline (not reused yet). Banner now accepts optional `ctaLabel` + `onCtaPress`; both the fallback and low-confidence banners pass an "Edit ingredients" CTA wired to the same `handleEditIngredients` handler the summary card uses (still a `console.log` until Day 11 ships the editor — but the banner now visibly invites the action with a bordered button styled in the banner's amber palette).
- `app/app/auth/sign-in.tsx` — removed the diagnostic `console.log('[google-signin] redirectTo:', redirectTo)` that survived the OAuth debugging marathon.

**Navigation back-from-results check:**
- Camera screen pushes `/scan/{id}` from inside the `(tabs)` stack and resets its own state to `'camera'` before pushing. `router.push` stacks the scan screens on top of the tabs navigator; pressing Android back / iOS swipe-back pops the scan stack, leaving the persistent camera tab still mounted underneath — no re-permission prompt, no viewfinder re-mount. Keeping `push` as-is. `router.replace` from the camera was considered but would replace the camera tab itself, breaking the tab navigator. Confirmed live by Justin during the dev-build smoke test.

**End-to-end validation (step 17):**
- Justin completed the full round trip on a real Android device via the EAS dev build: Google sign-in → camera tab → real fridge photo → upload → `generate-recipes` Edge Function → `/scan/{id}` results screen with 3 recipes and expiring items flagged. This doubles as the Day 8 Edge Function smoke test (deferred from Day 9). Implicit OAuth and Edge Function cold-start both behaved correctly; no retry was needed. Day 10's lifted `RecipeCard` is the next thing to ship to the device — visual confirmation will land with the next dev build.

**Auth flow note (Week 4 polish task):**
- The Google sign-in flow is currently using the **implicit OAuth flow** because Hermes doesn't ship `crypto.subtle`, so PKCE S256 fails silently. The `exchangeCodeForSession` branch in `sign-in.tsx` is dead code in production today but remains as fallback in case a future polyfill flips us to PKCE. Now that we're on a dev build (no longer Expo Go), switching to PKCE is feasible by adding `react-native-quick-crypto` or `expo-standard-web-crypto` and shimming `globalThis.crypto.subtle`. **Defer to Week 4 polish** — implicit flow is acceptable for the MVP launch.

**Verified locally:**
- `npx tsc --noEmit` — Day 10 files (`RecipeCard.tsx`, `[id].tsx`, `[id]/recipe/[index].tsx`, `_layout.tsx`, `sign-in.tsx`) are clean. The remaining errors are pre-existing Deno globals in the Edge Function (out of the app's TS scope).
- `EXPIRING_PILL_COPY` constant exported so the Day 12 detail screen will reuse the exact same string — prevents copy drift between card and detail.
- Banner CTA tap fires the `handleEditIngredients` console.log as expected.

**Day 10 status:** ✅ Complete.

### 2026-05-07 — Day 11 (editable ingredient list)

**Done in code:**
- `app/components/IngredientEditor.tsx` — bottom sheet modal built on React Native's stock `<Modal animationType="slide" presentationStyle="overFullScreen" transparent />`. No third-party bottom-sheet dep added. 85% screen height, dimmed backdrop (`rgba(0,0,0,0.45)`), tap-outside-to-close, rounded top corners. `KeyboardAvoidingView` with `padding` on iOS / `height` on Android keeps the footer above the keyboard when the "Add ingredient" input is focused.
- Header: "Edit ingredients" (Fraunces_700Bold 22pt) + close X. Subtitle is the second sentence from `LOW_CONFIDENCE_COPY` ("Tap any wrong items to remove them, or add what's missing.") so the editor reads as a continuation of the banner.
- Each row: tappable saffron dot on the left (filled when expiring, hollow `textLight` border otherwise), ingredient name (Inter_500Medium 16pt, capitalized first letter), quantity TextInput (Inter_400Regular 14pt textMuted, blur commits via local state), trash icon (Ionicons `trash-outline` 20pt textMuted) on the right. Expiring rows get a 3px Saffron left border (per step 22).
- "Add ingredient" row: dashed-border pill at the bottom of the list. Plus icon + TextInput with placeholder "Add an ingredient…", `returnKeyType="done"`, `onSubmitEditing` appends a new row (`quantity_estimate: ''`, `expiring_soon: false`, `confidence: 'high'`). Duplicate-name check (case-insensitive) silently no-ops + clears the input.
- Footer (sticky above keyboard): Forest Pine "Regenerate recipes" primary, ghost "Done" secondary. Disabled state at 50% opacity when the working list is identical to the open-time snapshot. Identity check serializes `{ name (lowercased), quantity_estimate, expiring_soon }` per row, sorts both, and compares — covers add/remove and per-row edits. While submitting the primary button shows an inline spinner + "Updating your recipes…" copy and Done is disabled.

**Wired into `app/app/scan/[id].tsx`:**
- `handleEditIngredients` flips a new `editorOpen` state instead of console-logging. All three entry points (summary card edit button + both banner CTAs) already share the handler, so they all open the same sheet.
- `<IngredientEditor visible={editorOpen} original={ingredients} onClose={...} onRegenerate={handleRegenerate} />` mounted at the bottom of the ScrollView. The Modal renders into the native overlay window so its placement inside the scroll view is fine (keeps state collocated with the screen).
- `handleRegenerate` builds `{ additional_ingredients, removed_ingredients }` via `diffIngredients(snapshot, working)` (added = names in working not in snapshot; removed = names in snapshot not in working; case-insensitive name comparison), calls `supabase.functions.invoke('generate-recipes', { body: { scan_id: id, additional_ingredients, removed_ingredients } })`, throws on error so the editor catches and surfaces the inline error row, then on success calls `loadScan()` to pull the fresh `detected_ingredients` + `recipes` from the row and dismisses the sheet.

**Diff strategy:**
- The Edge Function only needs adds and removes — quantity edits and expiring-soon toggles inside the editor are local UI state that don't get reported up. The model rebuilds quantities/expiring flags from the new image pass anyway. This matches the `additional_ingredients` / `removed_ingredients` contract already plumbed through the function.
- Snapshot pattern: editor copies `original` into `snapshot` state on open, never reads `original` again for the diff. Prevents the parent's `loadScan` (post-success) or any future refetch path from corrupting the user's in-progress edits before regenerate completes.

**Modal vs bottom-sheet-lib decision:**
- Stuck with stock RN `<Modal>` per plan instruction. `@gorhom/bottom-sheet` would add Reanimated v3 + gesture-handler integration cost (already in deps as transitives, but still a bundle size hit) for snap points, gesture-driven dismiss, and inertia. None of those are MVP-critical — the user gets a backdrop-tap close + Done button + Android hardware-back via `onRequestClose`. Revisit in Week 4 polish if the slide-up animation feels insufficient on hardware.

**Edge Function fixes (the regenerate path was buggy):**
- **Cache bypass on regen:** `cache_key` is hashed over `image_path + skill + cuisines + dietary` only, so a second invocation within 10 minutes — even with `additional_ingredients` / `removed_ingredients` — would have hit the cache and returned the *original* recipes. Added `isRegeneration = scan.recipes !== null` and skip the cache lookup when true. Cache still works for the "user navigated back to a recent scan" path (where recipes are already populated and the client wouldn't re-invoke anyway, but harmless).
- **Counter increment on regen:** the weekly scan counter was bumped on every non-cached invocation. That meant a user editing ingredients three times would burn their entire 3/week free quota on a single photo. Wrapped the counter increment in `if (!isRegeneration)`. Regen still bumps `last_active_at` so analytics stay honest.
- **Limit check on regen:** also skip the `scan_limit_reached` 402 when regenerating. A user already past the limit can still fix bad ingredients on their last scan; the photo itself was already counted.

**Microcopy:**
- Added "Updating your recipes…" to `knowledge/10-microcopy.md` under loading states. Used verbatim in the editor's submit state.

**Camera screen:**
- Confirmed: the camera does not open the editor. Only the results screen does. No camera changes shipped this day.

**Verified locally:**
- `npx tsc --noEmit` from `app/` — clean for Day 11 files (`IngredientEditor.tsx`, `scan/[id].tsx`). Remaining errors are the pre-existing Deno globals in the Edge Function, out of the app's TS scope. Same shape as Day 9/10.
- Disabled-state logic: opening the editor and tapping Done with no edits → button is at 50% opacity and `disabled={true}`. Adding/removing/toggling/quantity-editing → button enables. Reverting changes back to the snapshot → button disables again.
- Diff function: `diffIngredients` matches by lowercased name, which means "Onion" ↔ "onion" is a no-op (correct — model casing varies between passes). The prompt sees the user-facing original casing in `additional_ingredients`.

**Keyboard-handling quirks:**
- iOS: `KeyboardAvoidingView` with `behavior="padding"` works as expected — the footer rides up cleanly when the Add input or a row's quantity input gains focus.
- Android: `behavior="height"` is the canonical RN recommendation but real-device behavior is occasionally janky on tall keyboards. The dev build will be the real test; if it regresses, fall back to `windowSoftInputMode="adjustResize"` in the manifest (Expo defaults to this) and remove `behavior` entirely on Android. Don't touch unless verified broken on the next build.
- `keyboardShouldPersistTaps="handled"` on the inner ScrollView so tapping outside the input dismisses the keyboard without swallowing the trash icon tap.

**Open issues / deferred:**
- The "Done" button explicitly discards working-list edits per plan. No save-without-regen path exists by design; "Done" with changes is intentionally lossy. If users complain in beta, consider a confirm-on-discard, but ship without it.
- Per-row quantity edits and expiring toggles are not separately reported to the Edge Function (model regenerates everything from the new image). If a future flow wants to *only* tweak quantities without re-running vision, that needs a new code path.
- `IngredientEditor` exports `DetectedIngredient` for the screen to import. The duplicate type in `scan/[id].tsx` was removed — they now share one definition.

**Day 11 status:** ✅ Complete (pending visual confirmation on next dev build).

### 2026-05-07 — Day 12 (recipe detail screen)

**Done in code:**
- `app/app/scan/[id]/recipe/[index].tsx` — replaced the placeholder with the full layout. Kept the existing `useEffect` that fetches the scan row and picks the recipe at the route's `index` — that pattern works and the recipe JSON already lives on the scan row.
- **Header:** title in `Fraunces_700Bold` 28pt / line-height 34. Subtitle row mirrors `RecipeCard.metaRow` (cuisine · cook time · difficulty) using the same dot pattern so the two screens read as siblings. Difficulty rendered with `textTransform: 'capitalize'` since the JSON ships it lowercase.
- **Expiring callout:** amber `#FBE9CE` card (no border, 14px padding, 12px radius), saffron dot + `Inter_600SemiBold` 13pt heading "This recipe uses your soon-to-expire items". Item names rendered comma-joined on a wrapped line in `Inter_400Regular` 14pt color `#7A4A0F`, with `textTransform: 'capitalize'`. Skipped entirely when `uses_expiring` is empty.
- **`why_this_recipe` quote:** translucent Forest Pine card (`rgba(45, 95, 78, 0.08)`) with a 4px Forest Pine left border, `Fraunces_400Regular` 17pt italic, line-height 24, no quotation marks. Skipped when the field is missing/empty (`hasWhy` guard).
- **"Ingredients you have":** `Fraunces_700Bold` 18pt heading. Each row: green checkmark Ionicon (`checkmark-circle`, 18pt, `AppColors.success`) + capitalized name (`Inter_500Medium` 15pt) + middle dot + amount (`Inter_400Regular` 14pt textMuted). 6px row gap.
- **"You'll also need":** same heading style. Each row: 8px circle bullet (`AppColors.textLight`) + name + amount + " (optional)" suffix (`Inter_400Regular` 13pt textLight) when `optional: true`. When `ingredients_missing` is empty, the heading is suppressed and a single `Inter_400Regular` 14pt textMuted line "You've got everything." renders in its place — no orphaned heading.
- **Steps:** `Fraunces_700Bold` 18pt "Steps" heading. 24px Forest Pine circle with white `Inter_600SemiBold` 13pt number on the left, step text in `Inter_400Regular` 16pt with line-height **26** for breathing room. Number circle has `marginTop: 1` and `alignItems: 'flex-start'` on the row so it stays top-aligned with the first line of text when steps wrap. 14px vertical gap between steps. Numbering rendered manually from `i + 1`, no list-style hacks.
- **Save button (skeleton):** injected via `<Stack.Screen options={{ headerRight: () => ... }} />` — heart-outline Ionicon (24pt, `AppColors.text`) wrapped in a `Pressable` with `hitSlop: 12`. `onPress` is a `console.log('Save tapped — wired in Day 13')` placeholder. No saved-state visual, no fill toggle, no optimistic UI — Day 13 wires that.
- **Layout:** `ScrollView` with padding 16, paddingBottom 48 to clear the iOS home indicator. Background is `AppColors.background` (linen) so the surface-toned callouts pop. No sticky header beyond the existing nav bar.

**Type sharing decision:**
- Recipe shape defined locally in the detail screen (a single `Recipe` type with title, cuisine, cook_time_minutes, difficulty, uses_expiring, ingredients_used, ingredients_missing, steps, why_this_recipe). Did not lift into `RecipeCard.tsx` — `RecipeSummary` there is intentionally the card-only subset and conflating them would force the card to know about full-detail fields it doesn't render. The `Recipe` type in `scan/[id].tsx` already extends `RecipeSummary` with the same detail fields; if a third call site appears, lift then. Two definitions across two files is the right amount of duplication for now.

**"No missing ingredients" empty state:**
- The plan said to skip the section heading when `ingredients_missing` is empty. Implemented as: when empty, render only the "You've got everything." line inside the section wrapper (preserves the 16px top margin so the rhythm matches the surrounding sections). When non-empty, render heading + list. No orphaned section title in the empty case.

**Layout decisions made on the fly:**
- Item rows use `flexWrap: 'wrap'` so long names + amounts wrap cleanly on narrow devices instead of clipping. The middle dot + amount only render when `item.amount` is truthy — recipes with quantities baked into the name ("1 large onion, diced") get a clean single-line render instead of a trailing dot.
- Expiring item list has `paddingLeft: 16` so the wrapped names visually align under the heading text past the dot. Without it, the second line of a long expiring list dropped to the left edge of the card, which looked broken.
- Step number circle's `lineHeight: 16` on the number text + `marginTop: 1` on the circle gets the digit visually centered vertically inside the 24px circle on both iOS and Android. Without the lineHeight, Inter's default leading nudges the digit slightly low.
- Subtitle row uses two middle dots (cuisine · cook time · difficulty) rather than the RecipeCard's "cuisine · cook time + difficulty pill" pattern — the detail screen has more room to breathe and the inline chip wasn't pulling its weight at this scale.

**Verified locally:**
- `npx tsc --noEmit` from `app/` — clean for `scan/[id]/recipe/[index].tsx`. Remaining errors are the same pre-existing Deno globals in the Edge Function, out of the app's TS scope.
- All conditional branches reviewed: empty `uses_expiring` → no amber card. Empty `ingredients_missing` → "You've got everything." instead of a heading. Empty `why_this_recipe` → no quote callout. Empty `ingredients_used` → no "Ingredients you have" section (defensive; the model always returns this).
- Header heart icon renders, tap logs the Day 13 placeholder.

**Navigation back-from-detail:**
- The Expo Router stack is `camera tab → /scan/[id] → /scan/[id]/recipe/[index]`. `router.back()` from detail pops one frame to the results screen, which is correct. No custom back button — the default header arrow handles it. The existing `_layout.tsx` registration covers the route.

**Open issues / deferred to Day 13/14:**
- Save heart visual state (filled vs outline) lands Day 13 with `useSaveRecipe`. The icon being present in the header today means Day 13 only has to wire behavior, not layout.
- No in-detail "Edit ingredients" entry point. Per plan, that's a separate scope decision; the results screen has the three entry points.
- iOS rubber-banding and Android scroll behavior use ScrollView defaults — no overscroll tweaks. Smoke test on the next dev build push is the validation.
- The `Recipe` shape is duplicated between `scan/[id].tsx` and the detail screen. If Day 13's `useSaveRecipe` or the saved-recipe detail at `app/saved/[id].tsx` needs the same shape, lift to a shared `types.ts` then.

**Day 12 status:** ✅ Complete (pending visual confirmation on next dev build, alongside Day 10/11 changes).

---

## Day 13 — Implementation Notes (2026-05-07)

**Scope:** Save/favorite end-to-end, including the `Recipe` type lift, `<RecipeDetail />` extraction, `useSaveRecipe` hook, save heart on `RecipeCard`, real Recipes-tab list, saved-recipe detail screen, long-press soft-delete.

**Where `Recipe` lives now:**
- New `app/types/recipe.ts` exports `Recipe` as `RecipeSummary & { ingredients_used, ingredients_missing, steps, why_this_recipe }`. `RecipeSummary` stays in `components/RecipeCard.tsx` since it's the card-only subset.
- Both `scan/[id].tsx` and `scan/[id]/recipe/[index].tsx` now import `Recipe` from `@/types/recipe`. `saved/[id].tsx` joins as the third call site.

**Schema reality vs plan assumption:**
- `saved_recipes` has `scan_id` (nullable) but **no `recipe_index` column**. Falling back to title fingerprinting: a saved row is matched to an in-scan recipe by `(user_id, scan_id, title)`. In practice the AI almost never returns two recipes with the same title in one scan, so this is fine for v1. If we hit collisions later, a future migration adds `recipe_index integer`.
- `saved_recipes` snapshots: `title`, `cuisine`, `cook_time_minutes`, `difficulty`, `ingredients_used` (jsonb), `ingredients_missing` (jsonb), `steps` (jsonb), `why_this_recipe`. We do **not** persist `uses_expiring` since the array refers back to the originating scan's expiring items — saving it would freeze a no-longer-true claim. The saved-detail UI reconstructs the recipe with `uses_expiring: []`, which means saved recipes never show the amber "uses your soon-to-expire items" callout. That's the right call.

**`<RecipeDetail />` extraction:**
- Lifted to `app/components/RecipeDetail.tsx`. Props: `{ recipe: Recipe, savedId?: string | null, scanId?: string, popOnUnsave?: boolean }`. The header heart, Toast, save-limit Alert, and `useSaveRecipe` instance all live inside the component.
- `popOnUnsave` is the toggle for saved-detail vs scan-detail behavior. From `saved/[id].tsx` we set it true, so unsaving via the heart pops back to the Recipes tab. From `scan/[id]/recipe/[index].tsx` it's false — the user just sees the heart go from filled to outline.
- The lookup-on-mount path: when `savedId` is null and `scanId + recipe.title` are present, the hook does a one-shot query against `saved_recipes` to find a non-deleted match. This makes the heart correctly start filled when re-entering a recipe you've already saved.

**`useSaveRecipe` hook:**
- Owns three pieces of state: `isSaved`, `savedId`, `isPending`, plus a transient `limitReached` flag the caller can read after `toggle()` returns.
- `toggle()` returns a discriminated union (`saved | unsaved | limit_reached | error`) so the caller can drive UI without inspecting state. Keeps the hook agnostic to whether the caller wants a toast, an Alert, or both.
- Optimistic save: flips `isSaved=true` before the network call. On insert failure, rolls back to the previous state and returns `error`.
- Free-tier guard reads `users.saved_recipe_count`, but the **caller** has to pass it in via `savedCount`. This avoids the hook firing a profile fetch for every recipe card (the results screen renders 3 cards, so we'd otherwise hit `/users` 3 times on mount). The detail screen and results screen each fetch the count once and pass it down.
- Soft-delete: `update saved_recipes set deleted_at = now()`. Counter decrement is best-effort and not blocking — if the counter drifts, the next saved-row insert handles the limit check by querying live.

**Heart wiring on `RecipeCard`:**
- New optional `isSaved`, `onToggleSave`, `onPress`, `onLongPress` props. When `onToggleSave` is provided, the chevron is replaced by a heart in the header row. Saffron filled vs text outline — matches the detail screen.
- Heart Pressable has `hitSlop={8}` and stops propagation in its onPress to avoid triggering the card's onPress (which would navigate). Card tap still routes to the detail screen.
- `onPress` override lets the Recipes tab route to `/saved/{savedId}` instead of `/scan/{scanId}/recipe/{index}` when the card represents a saved row.

**Per-card hook isolation on results screen:**
- Tiny inline `<SavableScanRecipeCard />` wrapper in `scan/[id].tsx` owns one `useSaveRecipe` instance per recipe. This is cleaner than lifting save state to the parent because each card needs an independent `isPending` flag and `savedId`. The wrapper hands a unified `onToggleSave` to `RecipeCard` and surfaces toasts via a callback to the parent screen's `<Toast />` instance.

**Recipes tab (`app/(tabs)/recipes.tsx`):**
- Replaced the stub. Pulls `saved_recipes` filtered by `user_id` + `deleted_at IS NULL` ordered by `created_at desc`. Uses `useFocusEffect` so the list re-fetches every time the tab gains focus (saves elsewhere reflect immediately).
- Renders with `RecipeCard` (`isSaved` always true, no `uses_expiring` since it's not in the snapshot, tap routes to `/saved/{id}`, heart-tap and long-press both open the same "Remove this recipe?" Alert with destructive Remove button).
- Empty state: Fraunces 22pt "Your saved recipes." + Inter 15pt textMuted "Nothing saved yet — snap a photo to get started." centered vertically.
- Pull-to-refresh + skeleton loading mirror the results screen.

**Upgrade-modal stub:**
- Hook surfaces `limit_reached` from `toggle()`. Caller (RecipeDetail / SavableScanRecipeCard) renders a `React Native Alert.alert` with title `"5 saved recipes is the free limit."` body `"Plus unlocks unlimited saves."` buttons `"Maybe later"` (cancel) and `"Upgrade"` (logs `Paywall — Week 3`). Constants `SAVE_LIMIT_TITLE` / `SAVE_LIMIT_BODY` exported from the hook so Week 3 can import them at the real paywall site.

**Saved-detail screen:**
- New `app/saved/[id].tsx` reads the saved row, hydrates a `Recipe` (with `uses_expiring: []`), passes it to `<RecipeDetail recipe={…} savedId={id} scanId={row.scan_id ?? undefined} popOnUnsave />`.
- New `app/saved/_layout.tsx` mirrors `scan/_layout.tsx` for header consistency. Registered in the root `_layout.tsx` so deep links work.

**Toast component:**
- New `app/components/Toast.tsx` — absolute-positioned pill with fade in/out via `Animated.timing(opacity)`. Caller manages visibility via local state and a `setTimeout` (1500ms). Three current call sites (`RecipeDetail`, `scan/[id]`, `(tabs)/recipes`) all follow the same pattern. If a fourth shows up we'll look at lifting to a portal/context, but it isn't needed yet.

**Long-press soft-delete:**
- Recipes tab `<RecipeCard onLongPress={…}>` triggers `Alert.alert('Remove this recipe?', '', [Cancel, Remove (destructive)])`. On Remove: optimistic local-state filter + `update saved_recipes set deleted_at = now()` + `users.saved_recipe_count` decrement. Skipped Reanimated swipe gestures — Alert is sufficient for v1.

**TypeScript:**
- `npx tsc --noEmit` from `app/` is clean across all changed files. Remaining errors are the same pre-existing Deno globals in the Edge Function, out of the app's TS scope.

**Day 13 status:** ✅ Complete.

---

## Day 14 — Implementation Notes (2026-05-07)

**Scope:** Profile screen completion (skill, cuisines, dietary), scan-counter widget, Week 2 retro, CLAUDE.md bump.

**Skill-level radio tiles:**
- Three vertical `Pressable` cards in `app/(tabs)/profile.tsx`. Selected card gets `borderColor: AppColors.primary, borderWidth: 1.5` + a `checkmark-circle` Ionicon top-right. Each tile is Inter_600SemiBold 15pt title over Inter_400Regular 13pt textMuted subtitle.
- Values: `beginner`, `intermediate`, `confident` — exactly matches the `users.skill_level` check constraint.

**Cuisines pill multi-select:**
- 10 options: Italian, Mexican, Asian, Mediterranean, American, Indian, Middle Eastern, Latin American, French, Comfort food. Wrapping flexbox row with 8px gap.
- Pill style: `surface` background + 1px border when unselected; `primary` (Forest Pine) background + white text when selected. 12px / 8px padding, 999 border-radius.
- Max 5: at the cap, unselected pills get `opacity: 0.5` and ignore taps. Tapping a selected pill always deselects so the user can swap.

**Dietary pill multi-select:**
- 8 options: Vegetarian, Vegan, Gluten-free, Dairy-free, Halal, Kosher, Nut-free, Pescatarian. Same pill style except selected bg is `accent` (Saffron) — gives the user a visual differentiator from cuisines without resorting to a heading-only contrast.
- No max — users can stack as many dietary needs as apply. Plus-gating is deferred to Week 3.

**Save button:**
- Forest Pine primary, full-width 14pt vertical padding, "Save changes". Uses a memoized `dirty` flag computed against an `initial` snapshot stashed at load time; disabled (50% opacity) while `dirty` is false.
- On press: `update users set skill_level, preferred_cuisines, dietary_filters where id = …`. Re-baselines `initial` to the just-saved state, so the button correctly disables again until the next change. Toast `Saved! ✓` on success, `Couldn't save — try again.` on error (no rollback — the local form state stays intact so the user can retry).

**Scan-counter widget:**
- Sits between identity (avatar / name / email) and the divider above the prefs sections.
- Inter_500Medium 14pt label `"X of 3 scans used this week"`, then a 6px-tall progress bar (linen track, Forest Pine fill, 999 border-radius), then Inter_400Regular 12pt textMuted `"Resets May 14"` (formatted via `Intl.DateTimeFormat` short month + numeric day from `users.scan_week_resets_at`).
- Bar color flips to Saffron when the user has hit the cap (count >= 3) so the visual telegraphs "almost out".
- UI computes `0` when `scan_week_resets_at < now()` — the Edge Function only resets server-side on the next scan, so without this guard the bar would lie about the current state right after Sunday rollover.
- Always shown for now (TODO comment references Week 3 wire-up to hide for Plus users via `useUser`'s `subscription_tier`).

**Profile load:**
- Single `users` select on mount fetches `skill_level`, `preferred_cuisines`, `dietary_filters`, `scan_count_week`, `scan_week_resets_at`. ActivityIndicator while loading. No skeleton needed — the tab usually opens after auth so this is fast.

**Sign-out:**
- Existing sign-out button moves below the new sections behind a divider. No behavior change.

**Voice / copy review:**
- Section headings: "How you cook", "Cuisines you like", "Dietary needs" — sentence case, voice-aligned, no banned words.
- Skill subtitles: "Show me the basics.", "I cook a few times a week.", "I rarely follow recipes." — direct, second-person, no exclamation.
- Save toast `"Saved! ✓"` is the explicitly voice-rule-approved exception to the no-exclamation rule.
- Scan-counter copy is plain and informational; ready to swap for Plus-tier copy when paywall lands.

**TypeScript:**
- `npx tsc --noEmit` clean across `app/(tabs)/profile.tsx` and all Day 13 files together. Only pre-existing Deno-side errors remain.

**Week 4 polish backlog (added this week):**
- `Toast` could move to a portal/context if a 4th call site appears.
- `useUser` is now consumed in 5 screens; `UserProvider` lift is past due — defer to early Week 4.
- `SavableScanRecipeCard` triggers a `users.saved_recipe_count` fetch per card on the results screen (3 fetches per scan view). Cheap, but a `UserProvider` consolidation removes them entirely.
- Dietary-pill bg is straight Saffron — at the cap state we don't differentiate visually. Add a subtle "you've selected N" footer line if the count starts to feel hidden.

**Day 14 status:** ✅ Complete.

**Week 2 status:** ✅ Complete. Ready to plan Week 3 (monetization).


