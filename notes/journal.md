# Build Journal

## 2026-04-30 — Workspace bootstrapped

- Created `F:\Cookable App\` workspace using the Harbourview AI OS pattern
- Split build doc into 16 focused knowledge docs in `knowledge/`
- Set up commands: `/prime`, `/create-plan`, `/implement`, `/next-task`, `/progress`, `/ship-check`
- Added `cookable-copywriter` subagent for on-voice UI copy
- App codebase not yet initialized — that's Day 1 work

**Status:** Ready to start the 30-day build.
**Next:** Day 1 of build plan — Expo init, Supabase project, accounts setup.

## 2026-05-05 — Week 1 Foundation code complete

Ran `/implement` on `plans/2026-04-30-week-1-foundation.md`. All code-level tasks are done.

**What got built:**
- Expo project initialized in `app/` (SDK 54, Expo Router, TypeScript, new arch enabled)
- Brand theme (`constants/Colors.ts`) — Forest Pine, Saffron, Linen palette
- 4-tab navigation: Home, Scan (camera), Saved (recipes), Profile
- Auth screen with Apple Sign In (iOS) and Google OAuth (Supabase + WebBrowser)
- Root layout handles auth routing — unauthenticated users land on sign-in
- Fonts loaded: Fraunces (display) + Inter (UI)
- Camera screen: capture, gallery picker, image resize (1024px long edge), Supabase Storage upload, scans row insert
- Home, Recipes, Profile screens (functional stubs)
- Supabase client (`lib/supabase.ts`) with AsyncStorage session persistence
- `useUser()` hook for auth state
- Migration SQL (`supabase/migrations/001_initial_schema.sql`) — all 7 tables + RLS

**What's still manual (Day 1 account setup):**
- Supabase project + credentials + run migration + storage buckets
- Google OAuth enabled in Supabase Dashboard
- Apple Developer account + Sign in with Apple
- Domain, Anthropic, AdMob, RevenueCat, PostHog

**Deviation from plan:**
- Google sign-in uses Supabase OAuth + `expo-auth-session` + `expo-web-browser` instead of `@react-native-google-signin/google-signin`. This works in managed Expo workflow without a dev build.

**Build state after this session:** Code is done for Days 2-7. Day 1 account tasks remain. App will not run until `.env.local` is created with Supabase credentials.

## 2026-05-05 — Day 2 audit (Opus 4.7)

Re-reviewed all Day 2 artifacts produced by the prior Sonnet 4.6 session. Code was solid; a few real issues caught.

**Fixed:**
- `handle_new_user` trigger now `on conflict (id) do nothing` (idempotent — survives social-auth re-link edge cases without breaking signup)
- Storage RLS split into new `002_storage.sql` migration with full policies (insert/select/update/delete) for both `scan-images` (private, per-user folder) and `avatars` (public read, owner write). Previous setup had RLS commented out — uploads would have silently failed once buckets were created.
- `001_initial_schema.sql` now enables `moddatetime` extension and adds `before update` triggers on `users.updated_at` and `saved_recipes.updated_at`, so updates auto-bump without client-side bookkeeping.
- `app/.env.example` Anthropic key comment rewritten to make clear the key goes into Supabase Edge Function secrets (Day 8), not into `app/.env.local`. Anything bundled into the Expo client is extractable.
- `app/package.json` gained `typecheck` (`tsc --noEmit`) and `lint` (`expo lint`) scripts so `/ship-check` and any future CI have something concrete to run.
- `CLAUDE.md` "Next manual steps" updated: 002_storage.sql is now an explicit step, and the Anthropic key step now points at Edge Function secrets instead of `.env.local`.

**Skipped (not blocking — revisit later):**
- App-level `.gitignore` is redundant with the workspace gitignore, but keeping it is harmless and adds portability if `app/` ever moves to its own repo. (Audit item 6)
- `app.json` still uses the legacy top-level `splash` config rather than the `expo-splash-screen` plugin form. SDK 54 supports both; the legacy form will eventually warn. Defer to Week 4 polish (Day 24-25). (Audit item 7)

**Day 2 smoke test status:** Original step ("default Expo screen loads") is no longer reproducible because Day 3 replaced it with the auth flow. Superseded by the Day 3-7 smoke test, which is gated on Supabase credentials.

**Next:** Day 3 audit — auth flow (sign-in screen, root layout auth routing, useUser hook, Supabase client).

## 2026-05-05 — Day 3 audit (Opus 4.7)

Reviewed Day 3 artifacts (tasks 17-19): auth deps, sign-in screen, Supabase auth wiring + DB-trigger user-row creation. Four real bugs in the Apple sign-in path; everything else clean.

**Fixed:**
- Apple sign-in nonce wiring was wrong — was passing `credential.authorizationCode` as the `nonce` param to `signInWithIdToken`. The auth code isn't a nonce, and since we never passed a nonce to `AppleAuthentication.signInAsync`, the ID token has no nonce claim to verify against. Supabase would have rejected the token. Dropped the `nonce` field entirely; matches Supabase's official Expo Apple example. (For real CSRF-grade nonce protection later: generate raw nonce → SHA-256 → pass hash to `signInAsync`, raw to `signInWithIdToken`.)
- Apple cancel error code was `'ERR_CANCELED'`; expo-apple-authentication v8.x throws `'ERR_REQUEST_CANCELED'`. Every cancellation was firing the "Sign-in failed" alert. Now matches the actual code.
- Apple `display_name` was being silently dropped on first sign-in. Apple only returns `credential.fullName` once (their privacy model), and it lives on the JS credential, not in the ID token — so the `handle_new_user` DB trigger can't see it. Added a post-sign-in `update public.users set display_name` for new Apple users so we don't lose the name forever.
- Removed the non-null assertion on `credential.identityToken` (`!`) — replaced with an explicit guard that throws a clean error if Apple ever returns a credential without one.
- `CLAUDE.md` step 5 now spells out that Supabase redirect URLs must include both `cookable://auth/callback` AND the Expo Go `exp://…` URL, mirrored in Google Cloud Console — otherwise Google sign-in will bounce in Expo Go testing.

**Skipped (not blocking — revisit later):**
- Loading state hides the buttons rather than disabling them. Works, reads slightly worse. Defer to Week 4 polish.
- `users.last_active_at` is never bumped on auth events. Not a Day 3 task per the plan; wire it later in `useUser` or a small presence effect.

**Confirmed clean:**
- Auth deps installed (supabase-js, expo-apple-authentication, expo-auth-session, expo-web-browser, async-storage)
- `lib/supabase.ts` — correct AsyncStorage adapter, `detectSessionInUrl: false`, throws loudly on missing env. PKCE is default in supabase-js 2.105 so `exchangeCodeForSession` works.
- `hooks/useUser.ts` — proper getSession + onAuthStateChange + cleanup
- Root `_layout.tsx` segment-based auth routing
- Platform ordering — Apple-only on iOS (so it appears first), Google-only on Android (first there). Plan satisfied.
- `app.json` — `usesAppleSignIn: true`, `scheme: cookable`, `expo-apple-authentication` plugin present
- `handle_new_user` DB trigger handles row creation; client correctly does not duplicate it

**Day 3 smoke test status:** Gated on manual Supabase + Google OAuth + Apple Dev account setup. Cannot validate in code alone.

**Next:** Day 4 audit — navigation shell (tabs layout, placeholder screens) and `useUser` hook coverage in the tabs context.

## 2026-05-05 — Day 4 audit (Opus 4.7)

Reviewed Day 4 artifacts (tasks 20-22): tabs layout, four placeholder screens, and `useUser` re-evaluated as the in-tabs auth hook. Three real issues, all in or around `useUser`. Tab navigator and screen placeholders themselves were clean.

**Fixed:**
- `useUser` now exposes `profile` (a `UserProfile` row from `public.users` with `display_name`, `avatar_url`, `subscription_tier`). Apple-signed-in users had their name stored in `public.users.display_name` (per the Day 3 fix) but Home/Profile only read `auth.users.user_metadata` — so they got "Hey there" / "Your account" forever despite the name being in the DB. Home and Profile now prefer `profile.display_name` and fall back to `user_metadata` then email.
- `useUser` now bumps `users.last_active_at` on `SIGNED_IN`, `INITIAL_SESSION`, and `TOKEN_REFRESHED`. Best-effort (fire-and-forget, errors only `console.warn`) so a network blip doesn't break auth state. Deduped by user id so one mount = one bump per session, with the dedupe re-armed on `TOKEN_REFRESHED` (~hourly heartbeat) so we get an active-session signal going forward. Without this, every retention/active-cohort metric we ever build would be wrong from launch.
- `useUser` no longer hangs forever if `getSession()` rejects. Added a `.catch` that falls through to `{ session: null, user: null, profile: null, loading: false }` so the app routes to sign-in instead of stalling on a blank screen with `loading: true`. Also added a `cancelled` flag in the effect to avoid setState after unmount.

**Skipped (not blocking — revisit later):**
- Tabs layout has hardcoded `paddingBottom`/`height` instead of `useSafeAreaInsets()`. Works on home-bar iPhones; will look slightly off on iPhone SE / older devices and tablets. Defer to Week 4 polish (Days 24-25).
- Four `useUser()` consumers each spin up their own `getSession` + `onAuthStateChange` subscription (root layout, Home, Camera, Profile). Could centralize via a `UserProvider` context with one fetch and one listener. Pure optimization; not a Day 4 ask.
- Home screen renders the default "Home" header above the big "Hey, X" greeting — visually redundant. Style call, not a bug.
- Profile's sign-out imports `supabase` directly rather than going through a hook helper. Fine for now; only matters if we ever need pre-/post-sign-out side effects (cache clear, analytics flush).

**Confirmed clean:**
- Tab navigator structure — 4 tabs (Home, Scan, Saved, Profile), Ionicons, Forest Pine active tint, Inter for labels, header style on-brand
- Recipes empty state — copy on-voice, no banned words
- Profile sign-out flow — `Alert` confirmation, error toast on failure, root layout's auth-routing effect handles redirect after `signOut()` flips the session
- `useUser` fundamentals (post-fix) — `getSession` + `onAuthStateChange` + cleanup + new `cancelled` guard
- Nav dependencies present at correct SDK 54 versions: `expo-router`, `@react-navigation/native`, `react-native-screens`, `react-native-safe-area-context`
- Camera placeholder behavior fits Day 4 scope (full capture/upload flow is Days 5-7 territory and was audited at the code level in Day 3)
- TypeScript clean for all Day 4 changes (`tsc --noEmit` passes for `useUser.ts`, `(tabs)/index.tsx`, `(tabs)/profile.tsx`; one pre-existing unrelated error in the untracked default-template `components/ExternalLink.tsx`)

**Day 4 smoke test status:** Gated on the same manual Supabase setup as Days 2-3. Cannot validate in code alone — `last_active_at` bump, `profile` fetch, and Apple display_name surfacing all need a live database to confirm.

**Next:** Day 5-7 audit — camera capture, image resize, Supabase Storage upload, scans row insert (already partially implemented; review against the Day 5-7 plan tasks).

## 2026-05-05 — Day 5-7 audit (Opus 4.7)

Reviewed Day 5-7 artifacts (tasks 23-27): camera + picker + manipulator deps, capture/preview/upload state machine, image resize, Supabase Storage upload, `scans` row insert. Tasks 28-30 are real-device — out of scope, watch list compiled instead. One critical bug, four real UX/correctness issues, all fixed.

**Fixed:**
- **Upload pattern was producing zero-byte files.** `fetch(uri).then(r => r.blob())` is the canonical RN/Hermes gotcha — Supabase serializes the resulting wrapper as 0 bytes and the upload "succeeds" silently with an empty object in the bucket. Day 8 (Anthropic vision) would have failed mysteriously. Switched to `expo-file-system/legacy` `readAsStringAsync({ base64 })` → `base64-arraybuffer` `decode()` → ArrayBuffer, which is the documented Supabase RN path. Added `expo-file-system`, `expo-crypto`, `base64-arraybuffer` to deps.
- **`resizeImage` upscaled images smaller than 1024px.** A 600×800 source was being blown up to 768×1024, wasting bandwidth and Anthropic input tokens. Added an early-out: `if (Math.max(width, height) <= 1024) return uri`.
- **Permission "Allow camera access" button was dead after second iOS deny.** `requestPermission()` resolves immediately without prompting once `canAskAgain === false`. Now detects that state and switches the button + body copy to "Open settings" via `Linking.openSettings()`.
- **setState-after-unmount during in-flight upload.** If the user backgrounds the app or switches tabs during the upload, the post-await `setState` calls warn and leak. Added a `mountedRef` guard pattern (same shape as the `cancelled` flag in Day 4's `useUser` fix). Bails out before `setState('success')` or `setState('error')` if unmounted.
- **Hand-rolled `generateId()` replaced with `Crypto.randomUUID()` from `expo-crypto`.** The original worked (format-valid v4, accepted by Postgres `uuid`) but used `Math.random()`, which isn't crypto-strong, and reinvented the wheel. `expo-crypto` is the Expo-blessed path. Considered native `crypto.randomUUID()` from a `react-native-get-random-values` polyfill, but Hermes coverage of `randomUUID` (vs. `getRandomValues`) is uneven across RN versions and would have risked a runtime crash. `react-native-get-random-values` is still added — supabase-js uses it internally for nonces, so it's a useful baseline polyfill in `lib/supabase.ts`.

**Skipped (not blocking — revisit later):**
- **Library-picker permission denial is silent.** If the user denies media-library access, `launchImageLibraryAsync` returns `{ canceled: true }` indistinguishable from a normal cancel. Could call `requestMediaLibraryPermissionsAsync()` first and show a "needs access" UI like the camera one. Low priority — most users tap allow. Defer to Week 4 polish.
- **Redundant Android permissions in `app.json`.** `CAMERA` and `READ_MEDIA_IMAGES` are auto-injected by the `expo-camera` and `expo-image-picker` plugins during prebuild. The explicit list in `android.permissions` is harmless duplication. Defer.
- **`expo-image-manipulator` v14 API drift.** `manipulateAsync` still works but the new context-based API (`ImageManipulator.manipulate(uri).resize(...).renderAsync()`) is the forward path. Pure migration. Defer to Week 4 polish.
- **Default Expo template `components/ExternalLink.tsx`** has a pre-existing `@ts-expect-error` that's no longer needed under SDK 54. Untracked, not Cookable code. Either delete the file (we don't use it) or fix the comment. Defer.

**Confirmed clean:**
- **Bucket / path / RLS triangulation.** Code writes `{user_id}/{scan_id}.jpg` to bucket `scan-images`. RLS in `002_storage.sql` checks `auth.uid()::text = (storage.foldername(name))[1]` — `storage.foldername('user_id/scan_id.jpg')[1]` = `user_id`. Match holds for all four CRUD policies.
- **`scans` row insert.** `id` (uuid), `user_id` (uuid), `image_path` (text) match the schema. `image_path` stores the bare object key (no bucket prefix), which is the Supabase convention.
- **Voice on permission strings.** `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and the `expo-camera` / `expo-image-picker` plugin permission strings are all sentence case, no banned words, no exclamation, on-voice.
- **Resize math.** Long edge always becomes 1024 across portrait, landscape, and square inputs.
- **Error retry flow.** "Try again" calls `handleUpload` directly with the same `capturedUri`. "Start over" clears uri + error + state via `handleRetry`. Full reset works.
- **Auth gate edge case.** If session expires mid-await, storage RLS rejects and the catch path surfaces the error. No phantom state.
- **Resource cleanup.** No leaks — base64 string and array buffer are local to the upload function and GC'd after; cache-dir file:// URIs are cleaned up by the OS.
- **SDK 54 dep versions.** `expo-camera ~17.0.10`, `expo-image-picker ~17.0.11`, `expo-image-manipulator ~14.0.8`, plus the new additions all aligned to SDK 54.
- **`mediaTypes: ['images']`** is the correct new-API form for `expo-image-picker` v17.

**Real-device watch list (for tasks 28-30, out of audit scope):**
- Confirm the upload fix actually puts non-zero bytes in `scan-images`. The bug we fixed is silent — always check file size in Supabase Dashboard → Storage after first real upload.
- EXIF rotation: take a portrait photo on a real iPhone, open the resized file in the bucket, confirm it's not sideways. `expo-image-manipulator` should bake rotation in, but historically there have been platform regressions worth verifying.
- Android 13+ vs older: `READ_MEDIA_IMAGES` (13+) vs `READ_EXTERNAL_STORAGE` (handled by the picker plugin during prebuild). Test on at least one Android 12 device if available.
- Permanent-deny path on both platforms — confirm the "Open settings" button actually deep-links into the app's settings page.
- Background/kill the app mid-upload — confirm no crash and the UI recovers (mountedRef guard).
- Front/back camera switch on a real Android device.

**Day 5-7 smoke test status:** Code-level audit complete. Real upload validation gated on Supabase credentials + buckets created (manual Day 1 setup) plus a real device for tasks 28-30.

---

## 2026-05-05 — Week 1 retro

Week 1 closed (Day 7 of 30). All code-level Days 2-7 work is complete and audited. App will not run yet — every blocker is on the manual-account side.

**Shipped this week (code):**
- Expo SDK 54 project scaffolded, TypeScript clean for Cookable code
- Brand theme + 4-tab nav (Home / Scan / Saved / Profile)
- Auth: Apple sign-in (iOS) + Google OAuth (Supabase + WebBrowser, Expo-Go-friendly)
- Root layout auth routing + `useUser` hook with profile fetch + last_active heartbeat
- Camera: capture + library picker + resize + Supabase Storage upload + scans row, with full state machine and proper RN upload pattern
- Migration SQL: 7 tables, RLS on each, auto-create-user trigger, moddatetime triggers, storage RLS in `002_storage.sql`

**Audit fixes that landed this week (Days 2-7):**
- Day 2: idempotent `handle_new_user`, full storage RLS migration, `moddatetime` triggers, env-comment clarification on Anthropic key location, `typecheck`/`lint` scripts
- Day 3: Apple sign-in nonce wiring fix, correct cancel error code, post-sign-in `display_name` write for Apple, removed non-null assertion on `identityToken`, redirect-URL setup spelled out in CLAUDE.md
- Day 4: `useUser` exposes `profile`, bumps `last_active_at`, no longer hangs if `getSession` rejects, unmount guard
- Day 5-7: real-RN upload pattern, resize early-out, permission settings deep-link, mid-upload unmount guard, expo-crypto for UUIDs

**Carried into Week 2+ (deferred from audits):**
- Loading state on auth buttons (disable vs. hide) — Week 4 polish
- Library-picker denial UX — Week 4 polish
- Centralize `useUser` listeners into a single `UserProvider` context — pure optimization
- Tabs hardcoded `paddingBottom`/`height` instead of safe-area insets — Week 4 polish
- `app.json` legacy splash config → `expo-splash-screen` plugin — Week 4 polish
- `expo-image-manipulator` v14 new API migration — Week 4 polish
- Redundant Android permissions in `app.json` — defer
- Pre-existing `components/ExternalLink.tsx` TS error in default template — delete the file or fix; it's not used
- App-level `.gitignore` — keep, harmless

**Validation checklist status (from the plan):**
- [x] Expo project initializes (TypeScript clean for Cookable code)
- [ ] Week 1 accounts created — pending (manual)
- [ ] Supabase schema applied — pending (manual)
- [ ] Apple sign-in works — pending (Apple Dev account + real device)
- [ ] Google sign-in works — pending (Supabase Google OAuth configured)
- [ ] Camera captures, resizes, uploads, creates scans row — pending (Supabase creds)
- [x] `notes/journal.md` updated
- [x] CLAUDE.md "Build State" reflects Day 7

**Next:** Week 2 kickoff — create plan for Days 8-14 (Anthropic Sonnet 4.5 vision integration with structured JSON output, recipe display screen, editable ingredient list, save/favorite, basic profile). Day 8 prerequisites: Anthropic API key in Supabase Edge Function secrets, Supabase project actually live (Day 1 manual steps still outstanding).

## 2026-05-07 — Week 2 retro (Days 8-14 complete)

**What shipped:**
- Day 8-9: Supabase Edge Function `generate-recipes` (Deno) — Anthropic Sonnet 4.6 vision call, JWT auth, base64 image fetch via service role, structured JSON parsing, scan-row writeback, 10-min cache by `cache_key`, weekly scan-count enforcement, model migration `003_model_version.sql`
- Day 10: camera screen wires upload → Edge Function → `/scan/[id]`. Results screen reads `scans` row, renders detected ingredients summary + 3 recipe cards. RecipeCard lifted to `components/RecipeCard.tsx`
- Day 11: `IngredientEditor` modal — adds/removes items, calls Edge Function with `additional_ingredients` + `removed_ingredients` for in-flight regen. Edge Function regen contract: `scan.recipes !== null` → bypass cache + skip scan-count increment so quota stays per-photo, not per-AI-call. Deployed
- Day 12: full recipe detail screen at `app/scan/[id]/recipe/[index].tsx` — Fraunces 28pt title, cuisine·time·difficulty meta, amber expiring callout, Forest Pine translucent quote for `why_this_recipe`, green-checkmark `ingredients_used`, dotted-bullet `ingredients_missing` with optional suffix, "You've got everything." empty state, numbered Forest Pine step circles
- Day 13: save/favorite end-to-end. `Recipe` type lifted to `app/types/recipe.ts`. `<RecipeDetail />` extracted to `app/components/RecipeDetail.tsx` (shared by scan-detail and saved-detail). `useSaveRecipe` hook with optimistic toggle, soft-delete unsave, free-tier 5-row guard, 6th-save upgrade-modal stub. Heart wired in detail header (saffron filled vs text outline) and on `RecipeCard` (replaces chevron). Recipes tab pulls real `saved_recipes` rows on focus, supports pull-to-refresh + long-press soft-delete with confirm. New `app/saved/[id].tsx` + `app/saved/_layout.tsx`. `Toast` component for "Saved! ✓" feedback
- Day 14: profile screen completion — skill-level radio tiles (Beginner / Intermediate / Confident), preferred-cuisines pill multi-select (max 5, dim unselected at cap), dietary-filters pill multi-select (saffron-bg differentiator). Save button disables until form is dirty, shows "Saved! ✓" toast on success. Scan-counter widget at top: "X of 3 scans used this week" + 6px progress bar (Forest Pine, flips to Saffron at cap) + "Resets {date}". UI computes 0 if `scan_week_resets_at` has elapsed so the bar matches what the next scan would see

**Cut / deferred:**
- Swipe-to-delete on saved cards — long-press confirm Alert is enough for v1; Reanimated gesture lift not worth the day
- Dietary-filter Plus gating — kept all dietary pills free this week; Plus-gating wires up in Week 3 alongside RevenueCat
- Hide scan counter for Plus users — deferred to Week 3 (treat everyone as free for now, TODO comment in `profile.tsx`)
- Centralized `UserProvider` — still 4× duplicated `useUser` listeners; profiler hasn't shown a problem yet, leave for Week 4 polish
- Toast as a portal/context — local state per screen is fine for now; revisit if a 4th call site appears
- `recipe_index` column on `saved_recipes` — schema doesn't have one; we match by `(user_id, scan_id, title)` to detect existing saves, which is good enough since the AI rarely produces duplicate titles within a scan

**Surprises / learnings:**
- `saved_recipes` schema has `scan_id` but no `recipe_index`. Matching by title is fine in practice — Anthropic almost never returns two recipes with the same title in one response
- Saving from the results-screen card needs an isolated `useSaveRecipe` instance per card; wrapping with a tiny `<SavableScanRecipeCard />` keeps that state colocated without lifting to a parent
- `RecipeDetail` extraction was painless once the `Recipe` type was lifted first. The detail header heart wiring lives inside `RecipeDetail` so both scan and saved entry points share it — `popOnUnsave` toggles back-nav for the saved variant
- The detail screen needs to know `savedCount` up front to short-circuit a 6th save without a network round-trip. Loading once on mount is cheap and avoids the surprise where the user has to wait to see the upgrade modal
- The scan counter widget UI computes `0` when `scan_week_resets_at < now()` because the Edge Function only resets on the next scan — without this guard, the bar would show stale max state right after Sunday rollover

**Week 3 readiness check (monetization):**
- [ ] RevenueCat SDK install — `react-native-purchases` not yet added (deferred dep)
- [ ] AdMob SDK install — `react-native-google-mobile-ads` not yet added; placement IDs not yet pulled into `app.json`
- [ ] Paywall offering structure in RevenueCat dashboard — needs Plus monthly + annual product set up before client work starts
- [ ] Scan-limit modal copy lock — current copy `knowledge/10-microcopy.md` line 13 reads "You've used your 3 free scans this week. Resets Sunday — or unlock unlimited with Plus." Re-check tone with `cookable-copywriter` before wiring the trigger
- [ ] Save-limit modal copy — currently uses "5 saved recipes is the free limit." / "Plus unlocks unlimited saves." stubs in the hook. Re-check with copywriter or lock for Week 3
- [x] Server-side scan-limit enforcement — already live in the Edge Function (returns 429 + `scan_limit_exceeded` error code)
- [x] Client-side scan-counter UI — shipped on the profile this week
- [ ] Premium feature gate spec — doc which features become Plus (unlimited scans + ad-removal + dietary filters? unlimited saves?) and lock in `knowledge/02-pricing-and-tiers.md`

## 2026-05-08 — Week 3 retro (Days 15-21 complete)

**What shipped:**
- Day 15-16: AdMob banner + interstitial. `react-native-google-mobile-ads@16.3.3` installed. `app/lib/ads.ts` (idempotent init, content rating T, non-personalized — no ATT prompt). `app/components/AdBanner.tsx` mounted between summary card and recipes section, gated on `tier === 'free'`. `app/hooks/useInterstitial.ts` preloads, fires every 2nd lifetime scan, 4-min cooldown, raced against a 1.5s timeout on results-screen exit (forward nav + back nav both intercepted). Migration `004_subscription_telemetry.sql` adds `scan_count_lifetime`, `soft_prompt_dismissed_at`, `interstitials_shown_count` columns + backfills lifetime from the `scans` table. Edge Function bumps `scan_count_lifetime` on the non-regen path only.
- Day 17-19: RevenueCat + paywall + webhook. `react-native-purchases@10.1.0` installed. `app/lib/purchases.ts` (idempotent `configure`, graceful no-op when iOS key empty — Apple Dev account deferred). `app/hooks/useSubscription.ts` (DB-seeded tier prevents free-tier flash; AppState foreground revalidation; RC v10 `addCustomerInfoUpdateListener` with v10 static `removeCustomerInfoUpdateListener` cleanup). `app/components/UserProvider.tsx` lifted to root — five screens migrated from `useUser()` to `useUserContext()`. `app/app/paywall.tsx` modal route with source-conditional headlines, annual pre-selected, `purchasePackage` + `restorePurchases` flows, Toast feedback. `app/supabase/functions/revenuecat-webhook/index.ts` deployed `--no-verify-jwt`, shared-secret auth, upserts `users.subscription_*` + inserts `subscription_events`. All three `console.log('Paywall — Week 3')` stubs closed (camera limit → `hard_wall`; RecipeDetail save → `save_limit`; SavableScanRecipeCard save → `save_limit`).
- Day 20: dietary filter gate (free users see all 8 pills at 50% opacity; tapping any opens `?source=dietary`; existing selections preserved across downgrades). "Dietary needs · Plus" section heading with lock-closed-outline icon. Save-limit `Alert` title locked to mirror the paywall headline ("You've saved 5 – your free limit." replaces "5 saved recipes is the free limit." — same sentence for the doorway and the destination). Profile scan counter hidden for Plus users; replaced with "Unlimited scans with Plus." line.
- Day 21: `app/components/SoftPromptCard.tsx` — linen surface, saffron 4px left border, "You're on a roll." / "Unlock unlimited scans and no ads with Plus.", primary "See Plus" / ghost "Maybe later". Mounted at the top of `app/app/scan/[id].tsx` above banners. Strict `scan_count_lifetime === 2` eligibility — once a user passes scan #2, the card is gone forever (whether dismissed or never seen). Dismissal stamps `soft_prompt_dismissed_at` and is fire-and-forget. `02-pricing-and-tiers.md` got a "Locked feature matrix" table mapping each Plus feature to its enforcement location in code — beta QA source of truth.

**Cut / deviated:**
- Soft prompt card heading dropped the 🔥 emoji from the plan draft (`"🔥 You're on a roll"` → `"You're on a roll."`). The corresponding paywall headline was already de-emoji'd to `"You're on a roll."` during Days 17-19 microcopy lock; copywriter recommended matching them so the card-to-paywall transition reads as one continuous thought. Same logic dropped the `→` from the primary CTA ("See Plus" not "See Plus →") — the button affordance carries the forward motion, the arrow was decorative noise.
- Save-limit Alert title rewritten to verbatim match the paywall headline (`"You've saved 5 – your free limit."`) instead of the prior `"5 saved recipes is the free limit."` strings. Same word, same rhythm, no jarring rewrite when the user taps Upgrade.
- Profile dietary section gating uses 50% opacity on pills regardless of selected state. The plan said "selected state still renders" which it does (the saffron-bg differentiator still applies) — the locked styling stacks on top, dimming the whole pill. Existing selected pills look identical to selected pills before the gate; just dimmed.
- iOS RevenueCat key still empty (Apple Developer account financial constraint). Android-only paywall testing until ASC is set up. Logged on Days 17-19 — not a Days 20-21 deviation, just still true.
- Centralized `UserProvider` landed Days 17-19 (Week 2 carry-forward), one week earlier than the planned Week 4 polish — `useSubscription` needed a single mount point.

**Surprises / learnings:**
- `useUser`'s `UserProfile` type is intentionally narrow (id, display_name, avatar_url, subscription_tier). The soft prompt needs `scan_count_lifetime` + `soft_prompt_dismissed_at`, which aren't on `profile`. Direct supabase select in `SoftPromptCard` is the right call — keeps the global profile lean and gives the card a fresh post-Edge-Function read on mount, which matters because the lifetime counter increments inside `generate-recipes` *after* `useUser` did its profile fetch.
- The `AdBanner` still reads `useUser()` directly instead of `useUserContext()`. It works (both expose `profile.subscription_tier`) but it's the one screen that didn't migrate during the Days 17-19 lift. Not a Days 20-21 fix — flagged for Week 4.
- The save-limit Alert "Upgrade" button text stays "Upgrade" (unlocked by the iOS Alert pattern). The paywall lands user with `?source=save_limit` so the headline reframes — that's the consistency layer, not the Alert button label.
- `marginBottom` on the new `dietaryHeadingRow` style replaces the spacing the original `sectionHeading` carried solo (4pt → 12pt). Slight visual difference vs. the cuisines section above, acceptable given the section is more "gated" feeling.

**Carried into Week 4 (deferred):**
- AdBanner `useUser` → `useUserContext` migration (the one stragger from the Days 17-19 lift). Not blocking; tier check works either way.
- iOS RevenueCat: needs Apple Dev account ($99/yr — financial constraint). `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` empty until then. Purchases are Android-only.
- Android Play Console internal-testing track + IAP product creation (`cookable_plus_monthly`, `cookable_plus_annual`). Manual dashboard work — not coding.
- Toast portalization (still 4× call sites; not a hot path yet).
- Google sign-in PKCE switch (`react-native-quick-crypto` or `expo-standard-web-crypto`).
- Trial-end banner ("Trial ends May 15") on profile — `users.trial_ends_at` is populated but not displayed.
- AdMob prod unit IDs (banner already in env; interstitial IDs need adding pre-launch).

**Watch list for Week 4:**
- Soft prompt only renders when `subscriptionLoading === false` AND tier is free — confirm no flicker on cold start for Plus users with stale DB seed.
- Dietary section behavior on a downgrade: the user keeps their saved `dietary_filters` array, sees the pills selected (saffron bg) but locked at 50% opacity. Confirm this reads as "we kept your stuff" not "you can't change anything" during beta.
- Save-limit Alert "Upgrade" routes to `?source=save_limit` paywall headline — manually walk this on Android during Day 28 beta to confirm the Alert title and paywall headline read as the same sentence.
- Soft prompt one-shot: if a user nukes the app between scan #1 and scan #2, the card still renders (DB has `scan_count_lifetime === 2`). If they nuke between scan #2 and scan #3 *and* never saw the card, it's gone (`scan_count_lifetime === 3`, eligibility fails). That's the intended behavior — strict equality not `>= 2`.

**Validation checklist status (Week 3, Days 15-21):**
- [x] AdMob banner renders on results for free users; absent for Plus
- [x] Interstitial fires on every 2nd lifetime scan, max 1 / 4 min, free-only
- [x] AdMob non-personalized; no ATT prompt
- [x] RevenueCat `Purchases.configure` once per session, platform-specific key
- [x] Paywall renders Variant A by default + source-specific headlines for `save_limit` / `dietary` / `soft_prompt`
- [x] Annual pre-selected with "BEST DEAL" badge
- [x] `Purchases.purchasePackage` end-to-end (Android — iOS deferred until ASC)
- [x] `Purchases.restorePurchases` finds prior entitlement
- [x] `useSubscription` write-through updates `public.users.subscription_tier`
- [x] Webhook verifies shared secret, upserts `users`, inserts `subscription_events`
- [x] Camera 4th-scan → `/paywall?source=hard_wall`
- [x] Save-limit "Upgrade" → `/paywall?source=save_limit`
- [x] Dietary pills dim for free; tap → `/paywall?source=dietary`
- [x] Soft prompt on 2nd-scan results for free users; "Maybe later" stamps `soft_prompt_dismissed_at`
- [x] Profile hides scan counter for Plus, shows "Unlimited scans with Plus."
- [x] Week 3 copy reviewed by `cookable-copywriter` and added to `10-microcopy.md`
- [x] `02-pricing-and-tiers.md` has a locked feature matrix
- [x] `notes/journal.md` Week 3 retro entry added (this entry)
- [x] `CLAUDE.md` Build State reflects Day 21 of 30, Week 3 complete

**Next:** Week 4 kickoff (Days 22-30). Pantry tracking + grocery list (22-23), onboarding 8 screens (24-25), App Store assets (26-27), TestFlight beta (28-29), submit (30). Plan to be written in `plans/2026-05-XX-week-4-polish-and-ship.md` before Day 22.

## 2026-05-11 — Weekly progress snapshot

> Auto-generated snapshot from a stale session — it was written assuming we were still on Day 8, but the journal entries above show Days 8-21 were already complete by 2026-05-08. Kept here verbatim for the historical record; the "Variance: 4 days behind" framing is incorrect.

# Cookable Build Progress

**As of:** 2026-05-11

## Schedule
- **Plan target:** Day 12 of 30
- **Actual progress:** Day 8 of 30
- **Variance:** 4 days behind

## What's done
- Week 1 Foundation (Days 1-7): all code complete and audited
  - Expo SDK 54 project initialized (TypeScript, Expo Router, new arch enabled)
  - Brand theme (`constants/Colors.ts`) — Forest Pine, Saffron, Linen palette; Fraunces + Inter fonts loaded
  - 4-tab navigation: Home, Scan, Saved, Profile
  - Auth flow: Apple Sign In (iOS) + Google OAuth (Supabase + WebBrowser, Expo Go-friendly)
  - Camera screen: capture, gallery picker, image resize (1024px long edge), Supabase Storage upload, scans row insert
  - Migration SQL: 7 tables, RLS on each, auto-create-user trigger, moddatetime triggers, storage RLS in `002_storage.sql`
  - Full audit fixes (Days 2-7): idempotent user trigger, nonce wiring, cancel error code, post-sign-in display_name write, upload zero-byte fix, resize early-out, permission settings deep-link, mid-upload unmount guards, expo-crypto UUIDs
  - All 8 accounts confirmed: Apple Dev, Google Play, Anthropic, Supabase, AdMob, RevenueCat, PostHog, Domain
  - Week 2 plan drafted (`plans/2026-05-06-week-2-core-magic.md`)

## What's in flight
- `plans/2026-05-06-week-2-core-magic.md` — **Status: Draft** (ready to implement; no Week 2 code written yet)

## What's next (the critical path)
1. Link Supabase CLI and add Anthropic API key to Edge Function secrets (`supabase secrets set ANTHROPIC_API_KEY=...`) — prerequisite for all Week 2 AI work
2. Build and deploy `app/supabase/functions/generate-recipes/index.ts` (Days 8-10) — the core magic; every downstream feature depends on it
3. Wire camera screen to call the Edge Function and build the results screen (`app/app/scan/[id].tsx`) — completes the Camera → AI → Recipes loop, the #1 build priority

## Pre-launch checklist
- Accounts: 8 / 9 complete (Resend / Beehiiv email not yet confirmed)
- Legal: 0 / 5 complete
- Brand assets: 2 / 7 complete (color tokens + fonts in code; logo, icon, screenshots, press kit not done)
- App readiness: 0 / 13 complete (auth + camera code written and audited but not validated end-to-end on a real device)
- Pre-launch testing: 0 / 4 complete
- Distribution prep: 0 / 8 complete

## Risks / blockers
- **4 days behind schedule by calendar.** Today is Day 12 by date; actual build state is Day 8. Week 2 (Days 8-14) has not yet started — all tasks remain in the plan as "Draft."
- **Manual Supabase setup may be incomplete.** The project is "live" per CLAUDE.md, but migrations (`001_initial_schema.sql`, `002_storage.sql`), storage buckets, and `.env.local` are listed as pending manual actions. The Edge Function cannot be tested until these are confirmed done.
- **Auth not validated end-to-end.** Apple Sign In and Google OAuth code is written and audited but neither has been tested on a real device. This blocks a real Camera → AI → Recipes round trip.
- **Week 3 monetization (Days 15-21) starts in 10 calendar days.** If Week 2 slips further, monetization work gets compressed and the 30-day launch date is at risk.

## Suggested focus this week
With the build 4 days behind by calendar, the single most important move is to complete the Day 8 prerequisites (Supabase CLI link + Anthropic secret) and execute the Week 2 plan without delay. The `generate-recipes` Edge Function is the load-bearing piece — recipe display, editable ingredients, save flow, and the paywall trigger all depend on it. Aim to have the full Camera → AI → 3 Recipes round trip working by end of Day 10 (2026-05-13), then move straight into the editable ingredient list and recipe detail on Days 11-12. That recovers the slip before Week 3 monetization must begin.

## 2026-05-13 — Recipe loading scene (Day 26 polish)

Replaced the photo + bottom spinner overlay during the `analyzing` phase with a branded full-screen loading scene.

**What shipped:**
- `app/components/RecipeLoading.tsx` — Linen bg, Pine bowl + Saffron swirl composited from two independent PNGs so the swirl can animate on its own. Swirl runs a 1.6s rise+breathe loop via `Animated` native driver. Caption cycles through four time-based slots driven by `Date.now() - startedAt` (not a naïve interval), cross-fading at 180ms per transition. Reduce-motion respected: static swirl, instant caption swaps. Accessibility: one descriptive container label + `accessibilityLiveRegion="polite"` on the caption.
- `app/assets/icon-source/loading-bowl.svg` + `loading-swirl.svg` — extracted from the icon master into two scoped SVG sources (same 1024×1024 coordinate space, stack pixel-perfectly in RN).
- `app/assets/images/loading-bowl.png` + `loading-swirl.png` — rendered at 512×512 via the existing `tools/render-icons.mjs` pipeline (no new deps).
- `app/app/(tabs)/camera.tsx` — `analyzing` state lifted out of the photo+overlay branch; now renders `<RecipeLoading />` directly. `uploading` keeps "Saving photo…" overlay on the photo.
- `knowledge/10-microcopy.md` — two new rows: slot 2 "Spotting what you've got…" and slot 4 "Finishing up your recipes…", both reviewed and approved by `cookable-copywriter`.

**Caption sequence:**
1. "Looking at your fridge…" (0–2.5s) — pre-existing locked copy
2. "Spotting what you've got…" (2.5–5s) — copywriter approved 2026-05-13
3. "Building 3 recipes for you…" (5–10s) — pre-existing locked copy
4. "Finishing up your recipes…" (>10s, slow scans only) — copywriter approved 2026-05-13

**Deviations from plan:** None — all steps executed as written.

---
## 2026-05-18 — Weekly progress check

# Cookable Build Progress

**As of:** 2026-05-18

## Schedule
- **Plan target:** Day 19 of 30
- **Actual progress:** Day 26 of 30 (Day 26 polish complete as of 2026-05-13)
- **Variance:** 7 days ahead

## What's done
- **Week 1 (Days 1-7):** Expo SDK 54 scaffold, brand theme, 4-tab nav, Apple + Google auth, camera + upload + scans insert, migrations 001-002, full audit fixes
- **Week 2 (Days 8-14):** `generate-recipes` Edge Function (Claude Sonnet 4.6 vision), camera→results loop, ingredient editor + regen, recipe detail, save/favorite, profile + scan counter, migration 003
- **Week 3 (Days 15-21):** AdMob banner + interstitial, RevenueCat paywall + webhook, premium feature gates (scan limit, save limit, dietary filters), soft prompt, `UserProvider` context lift, migration 004
- **Day 22-23:** Pantry tab + grocery list (Plus-only); `PantryView`, `GroceryView`, `usePantry`, `useGroceryList`, Edge Function pantry upsert for Plus users, `RecipeDetail` "Add to grocery list" button, `paywall.tsx` pantry/grocery source branches, Locked Feature Matrix updated
- **Day 24-25:** 8-screen onboarding flow (`welcome` → `how-it-works` → `skill` → `cuisine` → `notifications` → `first-scan` → `auth-gate` → `soft-paywall`); anonymous Supabase auth on screen 6; `linkIdentity()` conversion on screen 7; `expo-notifications` weekly Sunday reminder; migration 005 (`onboarding_completed_at`)
- **Day 26 polish (2026-05-13):** `RecipeLoading.tsx` — branded full-screen linen scene replaces photo+spinner during `analyzing` phase; Pine bowl + Saffron swirl composited from two pre-rendered PNGs; 1.6s breathe loop; time-driven Fraunces caption cycling through four slots; reduce-motion + VoiceOver live region wired

## What's in flight
- `plans/2026-05-09-week-4-polish-and-ship.md` — **Status: Days 22-25 Implemented (Days 26-30 still Draft)**
  - Days 26-30 tasks remaining: store asset production (Day 26-27), beta distribution (Day 28-29), App Store + Play Console submission (Day 30)

## What's next (the critical path)
1. **App Store + Play Store assets (Days 26-27 remaining work)** — listing copy from `knowledge/11-app-store-listing.md` into consoles, 10 screenshots in all required sizes, iOS Privacy Nutrition Labels, Android Data Safety section; app icon + splash already rendered but prod AdMob app IDs in `app.json` still need swapping
2. **Apple Developer account purchase ($99/yr)** — hard blocker for Day 28-29 iOS TestFlight beta and Day 30 iOS submission; if unpurchased by Day 26 the Android-only path becomes the default
3. **Play Console internal-testing track + IAP product creation** — `cookable_plus_monthly` ($4.99) and `cookable_plus_annual` ($29.99), both 7-day trial; required before Android paywall sandbox testing on Day 28

## Pre-launch checklist
- Accounts: 7 / 9 complete (Apple Dev deferred — financial constraint; email provider not confirmed)
- Legal: 0 / 5 complete (privacy policy, ToS, support email, Privacy Nutrition Labels, Data Safety all outstanding)
- Brand assets: 5 / 7 complete (screenshots and press kit not yet done)
- App readiness: 10 / 13 complete (Apple Sign In blocked; push notifications coded but untested; dark mode not implemented)
- Pre-launch testing: 0 / 4 complete (beta not yet started)
- Distribution prep: 0 / 8 complete (landing page, email waitlist, social handles, TikTok content, PH hunter all outstanding)

## Risks / blockers
- **Apple Developer account ($99/yr) not purchased** — blocks iOS TestFlight beta (Day 28) and iOS App Store submission (Day 30); becomes a hard block if still missing on Day 26
- **Play Console internal-testing track + IAP products not configured** — blocks Android paywall sandbox testing; manual dashboard work, no code required
- **Legal pages (privacy policy + ToS) not hosted** — App Store and Play Console will reject submission without live URLs at `cookable.app/privacy` and `cookable.app/terms`; 2-hour task but not yet started
- **AdMob prod interstitial unit IDs missing from `eas.json`** — banner IDs wired; interstitial IDs need adding before the Day 28 production build
- **`AdBanner` still uses `useUser()` directly** — Week 3 carry-over; not blocking but flagged for clean-up before submission
- **Trial-end banner not displayed** — `users.trial_ends_at` is populated but not surfaced on the profile screen; minor polish gap

## Suggested focus this week
With the build running 7 days ahead of calendar schedule and Day 30 landing on 2026-05-29 (11 days away), the priority is clearing the external blockers before they become submission-day fires. The Apple Developer account purchase and Play Console IAP product setup are the only tasks that cannot be done by code — both need to happen this week to keep Day 28 beta on track. In parallel, the legal pages (privacy policy + Terms) are a 2-hour task on any generator (termly.io, freeprivacypolicy.com) hosted on the existing domain — there is no reason to leave these for Day 26. Once those external gates are open, the remaining build work (screenshots, store copy, production builds) is straightforward and well within the buffer the team has built up.

---
## 2026-06-01 — Weekly progress check

# Cookable Build Progress

**As of:** 2026-06-01

## Schedule
- **Plan target:** Day 30 of 30 (original submission target was ~2026-05-29 — 3 calendar days ago)
- **Actual progress:** Day 26 of 30 (last shipped: Recipe Loading scene, 2026-05-13)
- **Variance:** 4 plan-days behind; submission window missed by 3 calendar days

## What's done
- **Week 1 (Days 1-7):** Expo SDK 54 scaffold, brand theme, 4-tab nav, Apple + Google auth (Google validated; Apple pending account), camera + resize + Supabase Storage upload, migrations 001-002, full audit pass
- **Week 2 (Days 8-14):** `generate-recipes` Edge Function (Claude Sonnet 4.6 vision), camera-to-results loop, ingredient editor + regen (bypass cache, no quota increment), recipe detail screen, save/favorite with free-tier 5-save guard, profile + scan counter, migration 003
- **Week 3 (Days 15-21):** AdMob banner + interstitial (free-tier only, every 2nd lifetime scan), RevenueCat paywall + webhook (Android; iOS deferred), premium feature gates (scan limit, save limit, dietary filters, soft prompt on scan #2), `UserProvider` context lift, migration 004
- **Day 22-23:** Pantry tab + grocery list (Plus-only); `PantryView`, `GroceryView`, `usePantry`, `useGroceryList`, Edge Function pantry upsert, `RecipeDetail` "Add to grocery list", paywall source branches, Locked Feature Matrix updated
- **Day 24-25:** 8-screen onboarding flow (welcome → how-it-works → skill → cuisine → notifications → first-scan → auth-gate → soft-paywall); anonymous Supabase auth on screen 6; `linkIdentity()` conversion on screen 7; weekly Sunday push reminder; migration 005
- **Day 26 polish (2026-05-13):** `RecipeLoading.tsx` branded full-screen linen scene (Pine bowl + Saffron swirl, 1.6s breathe loop, four time-driven Fraunces captions, reduce-motion + VoiceOver wired)

## What's in flight
- `plans/2026-05-09-week-4-polish-and-ship.md` — **Status: Days 22-25 Implemented; Days 26-30 still Draft**
  - Days 26-27 (App Store + Play Store assets): not started
  - Days 28-29 (TestFlight + Play Console internal beta, bug-fix pass): not started
  - Day 30 (App Store Connect + Play Console submission): not started
- `plans/2026-05-13-recipe-loading-scene.md` — **Status: Implemented**

## What's next (the critical path)
1. **App Store + Play Store assets (Days 26-27)** — listing copy from `knowledge/11-app-store-listing.md` into consoles, 10 screenshots in all required sizes, iOS Privacy Nutrition Labels, Android Data Safety section; also swap AdMob test IDs to prod in `eas.json`
2. **Apple Developer account ($99/yr) purchase** — hard blocker for iOS TestFlight (Day 28) and App Store submission (Day 30); every day without this extends the slip
3. **Legal pages (privacy policy + ToS)** — App Store and Play Console will reject the submission without live URLs at `cookable.app/privacy` and `cookable.app/terms`; ~2 hours on any policy generator, then DNS/hosting — this should be done today

## Pre-launch checklist
- Accounts: 7 / 9 complete (Apple Dev deferred — financial constraint; email provider not confirmed)
- Legal: 0 / 5 complete (privacy policy, ToS, support email, Privacy Nutrition Labels, Data Safety all outstanding)
- Brand assets: 5 / 7 complete (App Store screenshots and press kit not yet done)
- App readiness: 10 / 13 complete (Sign in with Apple blocked; push notifications coded but untested on device; dark mode not implemented)
- Pre-launch testing: 0 / 4 complete (beta not yet started)
- Distribution prep: 0 / 8 complete (landing page, email waitlist, social handles, TikTok content, PH hunter all outstanding)

## Risks / blockers
- **Submission target date passed (2026-05-29)** — the 30-day window closed 3 days ago; 4 plan-days of work (Days 27-30) remain unstarted; no build activity since 2026-05-13
- **Apple Developer account ($99/yr) still not purchased** — blocks iOS TestFlight and App Store submission with no workaround; becomes a total iOS-launch blocker if not resolved this week
- **Legal pages (privacy policy + ToS) not hosted** — both stores require live URLs before review; a rejected submission adds at least 24-48h per round-trip on top of the existing slip
- **Play Console internal-testing track + IAP products not created** — blocks Android paywall sandbox testing and `cookable_plus_monthly` / `cookable_plus_annual` product validation; manual dashboard work, no code required
- **AdMob prod interstitial unit IDs missing from `eas.json`** — must be added before the Day 28 production build
- **Distribution prep at 0 / 8** — landing page, waitlist, social handles, and launch content have not started; at this rate there will be no audience ready at launch

## Suggested focus this week
The 30-day target has passed and the build is 4 plan-days from submission, but nothing unblocks without two non-code actions first: purchase the Apple Developer account and host the privacy policy and Terms of Service. Both have been flagged for weeks. Host the legal pages today (any free generator + a static page on the existing domain takes under two hours) and purchase the Apple account immediately so TestFlight can open in parallel with store asset production. With those gates open, the remaining work — screenshots, store listings, production builds — is bounded and can land this week. The distribution side (landing page, waitlist, social) is entirely unstarted and represents real launch-day risk independent of the store submission; even getting a waitlist page live and one social handle claimed would meaningfully reduce that gap.

---
## 2026-06-08 — Weekly progress check

# Cookable Build Progress

**As of:** 2026-06-08

## Schedule
- **Plan target:** Day 30 of 30 (submission target was 2026-05-29 — 10 calendar days ago)
- **Actual progress:** Day 26 of 30 (last code shipped 2026-05-13 — 26 days ago)
- **Variance:** 4 days behind; no new code has shipped in 26 days

## What's done
- **Week 1 (Days 1-7):** Expo SDK 54 scaffold, brand theme, 4-tab nav, Apple + Google auth (Google validated; Apple pending account), camera + resize + Supabase Storage upload, migrations 001-002, full audit pass
- **Week 2 (Days 8-14):** `generate-recipes` Edge Function (Claude Sonnet 4.6 vision), camera-to-results loop, ingredient editor + regen (bypass cache, no quota increment), recipe detail screen, save/favorite with free-tier 5-save guard, profile + scan counter, migration 003
- **Week 3 (Days 15-21):** AdMob banner + interstitial (free-tier only, every 2nd lifetime scan), RevenueCat paywall + webhook (Android; iOS deferred), premium feature gates (scan limit, save limit, dietary filters, soft prompt on scan #2), `UserProvider` context lift, migration 004
- **Day 22-23:** Pantry tab + grocery list (Plus-only) — `PantryView`, `GroceryView`, `usePantry`, `useGroceryList`, Edge Function pantry upsert for Plus users, `RecipeDetail` "Add to grocery list" button, `paywall.tsx` pantry/grocery source branches, Locked Feature Matrix updated
- **Day 24-25:** 8-screen onboarding flow (welcome → how-it-works → skill → cuisine → notifications → first-scan → auth-gate → soft-paywall); anonymous Supabase auth on screen 6; `linkIdentity()` conversion on screen 7; weekly Sunday push reminder; migration 005
- **Day 26 polish (2026-05-13):** `RecipeLoading.tsx` branded full-screen linen scene (Pine bowl + Saffron swirl, 1.6s breathe loop, four time-driven Fraunces captions, reduce-motion + VoiceOver wired)

## What's in flight
- `plans/2026-05-09-week-4-polish-and-ship.md` — **Status: Days 22-25 Implemented; Days 26-30 still Draft**
  - Days 26-27 (App Store + Play Store assets): not started
  - Days 28-29 (TestFlight + Play Console internal beta, bug-fix pass): not started
  - Day 30 (App Store Connect + Play Console submission): not started
- All other plans (`week-1-foundation`, `week-2-core-magic`, `week-3-monetization`, `recipe-loading-scene`) — **Status: Implemented**

## What's next (the critical path)
1. **Legal pages (privacy policy + ToS) — immediate, non-code, ~2 hours.** Both stores reject submissions without live URLs at `cookable.app/privacy` and `cookable.app/terms`. Use termly.io or freeprivacypolicy.com; host on the existing domain. This has been the top non-code blocker for three weeks with no action.
2. **Apple Developer account purchase ($99/yr)** — hard blocker for iOS TestFlight (Day 28) and App Store submission (Day 30). Every week without it pushes iOS launch further out. If not resolved this week, plan to ship Android-only and re-open iOS in June.
3. **App Store + Play Store assets (Days 26-27)** — the first remaining code task. Listing copy from `knowledge/11-app-store-listing.md`, 10 screenshots in all required sizes, iOS Privacy Nutrition Labels, Android Data Safety section, swap AdMob test app IDs to prod in `app.json` / `eas.json`.

## Pre-launch checklist
- Accounts: 7 / 9 complete (Apple Dev deferred — financial constraint; email provider not confirmed)
- Legal: 0 / 5 complete (privacy policy, ToS, support email, Privacy Nutrition Labels, Data Safety all outstanding)
- Brand assets: 5 / 7 complete (App Store screenshots and press kit not yet done)
- App readiness: 10 / 13 complete (Sign in with Apple blocked; push notifications coded but untested on device; dark mode not implemented)
- Pre-launch testing: 0 / 4 complete (beta not yet started)
- Distribution prep: 0 / 8 complete (landing page, email waitlist, social handles, TikTok content, PH hunter all outstanding)

## Risks / blockers
- **26 days since last code shipped (2026-05-13)** — the build has been stalled for nearly four weeks; momentum risk increases with every idle day
- **Submission target passed 10 days ago (2026-05-29)** — 4 plan-days of work (Days 27-30) remain unstarted; no new work has landed since the previous snapshot
- **Apple Developer account ($99/yr) still not purchased** — blocks iOS TestFlight and App Store submission with no workaround; if unpurchased by end of this week, ship Android-only and fold iOS in post-launch
- **Legal pages (privacy policy + ToS) not hosted** — both stores will reject without live URLs; a rejected submission adds 24-48h per round-trip on top of the existing slip; this is a 2-hour task with no code dependency
- **Play Console internal-testing track + IAP products not created** — blocks Android paywall sandbox testing; manual dashboard work, no code required
- **AdMob prod interstitial unit IDs missing from `eas.json`** — must be added before the Day 28 production build
- **Distribution prep at 0 / 8** — landing page, waitlist, social handles, and launch content are entirely unstarted; launch without an audience in place dramatically reduces day-one conversion chances

## Suggested focus this week
The build is functionally complete through Day 26 and four days of work separate it from submission — but those four days are being blocked by non-code decisions that have stalled for a month. The immediate priority is clearing the two external gates: host the legal pages today (generator + static hosting, under two hours) and purchase the Apple Developer account this week or commit to Android-only launch. Once those gates are open, the remaining work — store screenshots, listing copy, production EAS builds, beta invites — can land in a focused 3-5 day push. In parallel, even a single distribution action (a waitlist landing page, one TikTok draft, one social handle claimed) would meaningfully reduce launch-day risk. The code is ready; the blockers are all decisions and admin tasks.

---
## 2026-06-15 — Weekly progress check

# Cookable Build Progress

**As of:** 2026-06-15

## Schedule
- **Plan target:** Day 30 of 30 (submission target was ~2026-05-29 — 17 calendar days ago)
- **Actual progress:** Day 26 of 30 (last code shipped 2026-05-13 — 33 days ago)
- **Variance:** 4 plan-days behind; no new code or external actions completed in 33 days

## What's done
- **Week 1 (Days 1-7):** Expo SDK 54 scaffold, brand theme, 4-tab nav, Apple + Google auth (Google validated; Apple pending account), camera + resize + Supabase Storage upload, migrations 001-002, full audit pass
- **Week 2 (Days 8-14):** `generate-recipes` Edge Function (Claude Sonnet 4.6 vision), camera-to-results loop, ingredient editor + regen (bypass cache, no quota increment), recipe detail screen, save/favorite with free-tier 5-save guard, profile + scan counter, migration 003
- **Week 3 (Days 15-21):** AdMob banner + interstitial (free-tier only, every 2nd lifetime scan), RevenueCat paywall + webhook (Android; iOS deferred), premium feature gates (scan limit, save limit, dietary filters, soft prompt on scan #2), `UserProvider` context lift, migration 004
- **Day 22-23:** Pantry tab + grocery list (Plus-only) — `PantryView`, `GroceryView`, `usePantry`, `useGroceryList`, Edge Function pantry upsert for Plus users, `RecipeDetail` "Add to grocery list" button, paywall source branches, Locked Feature Matrix updated
- **Day 24-25:** 8-screen onboarding flow (welcome → how-it-works → skill → cuisine → notifications → first-scan → auth-gate → soft-paywall); anonymous Supabase auth on screen 6; `linkIdentity()` conversion on screen 7; weekly Sunday push reminder; migration 005
- **Day 26 polish (2026-05-13):** `RecipeLoading.tsx` branded full-screen linen scene (Pine bowl + Saffron swirl, 1.6s breathe loop, four time-driven Fraunces captions, reduce-motion + VoiceOver wired)

## What's in flight
- `plans/2026-05-09-week-4-polish-and-ship.md` — **Status: Days 22-25 Implemented; Days 26-30 still Draft**
  - Days 26-27 (App Store + Play Store assets): not started
  - Days 28-29 (TestFlight + Play Console internal beta, bug-fix pass): not started
  - Day 30 (App Store Connect + Play Console submission): not started
- All other plans (`week-1-foundation`, `week-2-core-magic`, `week-3-monetization`, `recipe-loading-scene`) — **Status: Implemented**

## What's next (the critical path)
1. **Legal pages (privacy policy + ToS) — non-code, ~2 hours, overdue by 3 weeks.** Both stores reject submissions without live URLs at `cookable.app/privacy` and `cookable.app/terms`. Use termly.io or freeprivacypolicy.com and host on the existing domain. This is the single lowest-effort, highest-impact unblocking action remaining.
2. **Apple Developer account purchase ($99/yr) or commit to Android-only launch.** Hard blocker for iOS TestFlight (Day 28) and App Store submission (Day 30). The 17-day slip since the original target date makes deferring iOS and shipping Android-only a reasonable decision to make today.
3. **App Store + Play Store assets (Days 26-27)** — first remaining code task; can start in parallel once legal pages are live. Listing copy from `knowledge/11-app-store-listing.md`, 10 screenshots in all required sizes, iOS Privacy Nutrition Labels, Android Data Safety section, swap AdMob test IDs to prod in `eas.json`.

## Pre-launch checklist
- Accounts: 7 / 9 complete (Apple Dev deferred — financial constraint; email provider not confirmed)
- Legal: 0 / 5 complete (privacy policy, ToS, support email, Privacy Nutrition Labels, Data Safety all outstanding)
- Brand assets: 5 / 7 complete (App Store screenshots and press kit not yet done)
- App readiness: 10 / 13 complete (Sign in with Apple blocked by Apple Dev account; push notifications coded but untested on device; dark mode not implemented)
- Pre-launch testing: 0 / 4 complete (beta not yet started)
- Distribution prep: 0 / 8 complete (landing page, email waitlist, social handles, TikTok content, PH hunter all outstanding)

## Risks / blockers
- **33 days since last code shipped (2026-05-13)** — third consecutive weekly snapshot with zero progress; this is now a momentum and motivation risk as much as a schedule risk
- **Submission target passed 17 days ago (2026-05-29)** — 4 plan-days of work remain unstarted; none of the external gates from the prior two snapshots have been cleared
- **Apple Developer account ($99/yr) still not purchased** — blocks iOS TestFlight and App Store submission; if not resolved this week, ship Android-only and fold iOS into a follow-up update
- **Legal pages (privacy policy + ToS) not hosted** — both stores will reject without live URLs; this is a 2-hour task with no code dependency that has now been flagged three weeks in a row with no action
- **Play Console internal-testing track + IAP products not created** — blocks Android paywall sandbox testing; manual dashboard work, no code required
- **AdMob prod interstitial unit IDs missing from `eas.json`** — must be added before the Day 28 production build
- **Distribution prep at 0 / 8** — landing page, waitlist, social handles, and launch content are entirely unstarted; 33 days of audience-building time has been lost since the build stalled

## Suggested focus this week
Three consecutive weekly snapshots have reported identical blockers with no movement. The code is done through Day 26 and the remaining four days of build work are mechanical — but none of it can ship without the legal pages and (for iOS) the Apple Developer account. The decision to make right now is whether to pursue a dual-platform launch or to ship Android first and add iOS later; either path is viable, but the current state — neither committed nor moving — is the worst outcome. Host the legal pages today (two hours, no code required), make the iOS decision this week, and then run the store-assets sprint (Days 26-27) immediately after. A focused week can still get this to TestFlight and Play Console internal testing before the month ends.

