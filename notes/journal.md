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

## 2026-05-11 — Weekly progress check

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
