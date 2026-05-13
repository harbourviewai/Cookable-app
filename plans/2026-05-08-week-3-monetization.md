# Plan: Week 3 — Monetization (Days 15-21)

**Created:** 2026-05-08
**Status:** Implemented (Days 15-21 all complete — implemented 2026-05-08)
**Request:** Wire AdMob (banner + interstitial), RevenueCat (Plus paywall + 7-day trial), real scan-limit / save-limit / dietary-filter paywall triggers, premium feature gates, and the soft prompt — closing every `console.log("Paywall — Week 3")` stub from Week 2.
**Relevant knowledge docs:** 04-build-plan.md, 02-pricing-and-tiers.md, 09-paywall-strategy.md, 03-mvp-scope.md, 05-tech-stack.md, 06-database-schema.md, 10-microcopy.md, 12-brand-identity.md

---

## Overview

Week 2 shipped the core magic loop. Week 3 turns it into a business. By end of Day 21:

- **Free** users see banner ads on results, get interstitials at a sane frequency, hit a hard paywall on the 4th scan, hit a save-limit upgrade prompt past 5 saves, and see dietary filters dimmed-and-locked.
- **Plus** users see no ads, get unlimited scans, save unlimited recipes, and can use dietary filters.
- A 7-day free trial is wired through RevenueCat with card required up front. The paywall ships in Variant A (waste angle) — Variant D is reserved for the post-launch A/B (per `09-paywall-strategy.md`).
- The DB's `subscription_tier` is kept in sync via a RevenueCat webhook Edge Function, so the existing client-side `useUser().profile.subscription_tier` and the Edge Function's `scan_limit_reached` check both have the right answer.

By the build plan's Day 21 marker we've cleared the spec's "Premium feature gates" line entirely, leaving only Week 4 polish (onboarding, pantry, store assets) before submit.

## Current State

What exists and works (entering Week 3):
- `users.subscription_tier` defaults to `'free'`. The Edge Function already reads it (`tier === 'free' && !isRegeneration && effectiveCount >= FREE_SCAN_LIMIT` → 402). `useUser()` exposes it on `profile.subscription_tier`. Nothing writes to it yet — every account is `'free'`.
- Free-tier scan limit (3 / rolling 7 days) is enforced server-side. Camera shows a `state === 'limit'` blocker screen with a "Got it" button.
- Free-tier save limit (5 saved recipes) is enforced client-side via `useSaveRecipe`. On `limit_reached` an `Alert.alert` shows with `[Maybe later, Upgrade]`. The Upgrade button currently `console.log('Paywall — Week 3')`.
- Profile screen renders dietary filter pills with no tier check — every user can toggle them and they get sent to the AI prompt.
- No ads anywhere. No RevenueCat init. No `.env.local` keys for either yet.
- Soft-prompt (after 2nd scan) has no tracking surface and no UI.

### Stubs to close (audit before coding)
- `app/components/RecipeDetail.tsx:111` — `console.log('Paywall — Week 3')`
- `app/app/scan/[id].tsx:299` — `console.log('Paywall — Week 3')` inside `SavableScanRecipeCard`
- `app/app/(tabs)/camera.tsx:245-258` — `state === 'limit'` blocker; replace with navigation to the paywall
- `app/app/(tabs)/profile.tsx:262` — `// TODO: hide for Plus once RevenueCat lands in W3` on the scan counter

## Week 2 Carry-Forwards (still on the watch list, not blocking Week 3)
- `UserProvider` lift past due — `useUser` is now consumed in 5+ screens; Week 3 will add a 6th (`useSubscription`). The pragmatic call is to do the lift on Day 17 alongside `useSubscription`, since both want the same provider story.
- `Toast` could move to a portal/context if a 4th call site appears (this week introduces a 4th in the paywall/soft-prompt flow — we'll consolidate during Day 18).
- Google sign-in PKCE switch — Week 4 polish, untouched here.

---

## Prerequisites Before Day 15 Code Can Be Tested

These are manual / dashboard tasks that must be done before the matching code day. None of them are coding work — they unblock testing.

1. **RevenueCat dashboard (before Day 17):**
   - Create the `cookable_plus` entitlement.
   - Create offering `default` with two products: `cookable_plus_monthly` ($4.99 USD, 7-day free trial) and `cookable_plus_annual` ($29.99 USD, 7-day free trial). Mark annual as the highlighted option.
   - Configure App Store Connect IAP: subscription group `Cookable Plus`, two auto-renewing subscriptions matching the product IDs above. Status "Ready to Submit" is sufficient for sandbox.
   - Configure Play Console subscriptions: same product IDs, same prices.
   - Pull the public iOS API key + public Android API key into `.env.local` as `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
   - From RevenueCat → Project Settings → Webhooks: add the Supabase Edge Function URL (filled in Day 19) with a shared-secret header.

2. **AdMob dashboard (before Day 15):**
   - Confirm Cookable's iOS and Android apps exist in AdMob.
   - Create banner ad unit + interstitial ad unit for each platform (4 IDs total). Status will be "pending review" — ad fill won't happen for ~24h after first request, which is fine for development since we'll use Google's universal test IDs in dev/EAS preview builds anyway.
   - Note prod IDs but **don't** put them in `app.json` yet — we wire test IDs first and gate prod on `__DEV__ === false`.

3. **Supabase secrets (before Day 19):**
   - `npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random 32-byte hex>` — same value goes into the RevenueCat dashboard's webhook authorization header.

4. **Copy review with `cookable-copywriter` (before Day 17):**
   - Hard paywall headline + subhead + benefit list (Variant A from `09-paywall-strategy.md`).
   - Save-limit modal copy (replace stub strings in `useSaveRecipe.ts`).
   - Dietary-filter feature-gate copy.
   - Soft-prompt card copy.

---

## Proposed Changes

### Day 15-16 — AdMob

Install `react-native-google-mobile-ads`, configure the Expo plugin, render a banner on the results screen for free users, fire an interstitial after every 2nd scan for free users. Gate everything off `subscription_tier === 'free'`.

### Day 17-19 — RevenueCat + paywall + tier sync

Install `react-native-purchases`. Build a `useSubscription` hook on top of `useUser` that initializes RevenueCat, exposes `tier` and `isPlus`, and pushes entitlement changes to `public.users`. Build the paywall screen at `app/paywall.tsx` matching the Variant A copy in `09-paywall-strategy.md`. Wire purchase + restore. Stand up a Supabase Edge Function `revenuecat-webhook` that's the authoritative source for tier sync, writing to `public.users` and inserting into `public.subscription_events`.

### Day 20-21 — Feature gates + soft prompt + retro

Replace the three `console.log('Paywall — Week 3')` stubs with `router.push('/paywall?source=...')`. Replace the camera scan-limit screen with a paywall route. Gate dietary filter pills (dim + paywall on tap) for free users. Surface the soft prompt after the user's 2nd successful scan. Hide the scan counter for Plus users. Update CLAUDE.md, journal, and `02-pricing-and-tiers.md`.

---

## Design Decisions

**RevenueCat is authoritative; DB is a cache.** The schema already enforces this design — `users.subscription_tier` exists with the comment "RevenueCat is authoritative" and `subscription_events` exists for the webhook log. We follow that. The client uses `useSubscription` for fast tier checks (already cached in `users` row, refreshed on every auth state change). The webhook is the only writer that's load-bearing — client-side updates from `Purchases.getCustomerInfo()` are best-effort and only used to keep the local `users` row from being stale between webhook delivery and the next auth refresh.

**One paywall route, multiple sources.** Per `09-paywall-strategy.md` we have 4+ trigger points (hard wall, save limit, dietary filter, soft prompt, post-onboarding). They all route to the same `app/paywall.tsx` screen with `?source=...` so we can attribute conversions in PostHog later. The paywall reads `source` and slightly reframes the headline (e.g. for `save_limit`: "You've saved 5 — your free limit. / Plus unlocks unlimited saves." instead of the default Variant A waste angle). All variants share the same plan toggle, CTA, and footer.

**Variant A only for launch.** Per the strategy doc, Variant D (value math) waits until 2 weeks of baseline. That means Day 17 codes Variant A and exposes the variant via a `PAYWALL_VARIANT` constant we can flip post-launch — no dynamic A/B routing yet (RevenueCat's experiments require Pro tier; PostHog feature flags are the planned tool, but we're shipping launch with a single variant).

**Annual is pre-selected.** Per `02-pricing-and-tiers.md` and `09-paywall-strategy.md` — 50% saving is the headline value prop. Selected pill on mount = annual. The "BEST DEAL" badge and per-month math line ($2.50/month — best value) are static.

**Card required up front for trial.** RevenueCat handles the trial entitlement bookkeeping. The user agrees to be charged when the trial ends. Subhead under CTA: "Cancel anytime. No charge today." Push notification 3 days before trial ends is deferred to Week 4 (Expo Notifications setup is Day 26 territory).

**AdMob non-personalized mode by default.** Per `05-tech-stack.md`, we configure non-personalized ads at SDK init (`setRequestConfiguration({ maxAdContentRating: 'T', tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false })` + per-request `requestNonPersonalizedAdsOnly: true`). This avoids the ATT prompt on iOS — confirmed in the tech-stack doc. ATT prompt is **explicitly out of scope** for MVP. We do **not** add `NSUserTrackingUsageDescription` to `app.json` or call `requestTrackingPermissionsAsync()`. If Apple's review flags this we revisit; the spec deliberately ships without it.

**Test IDs only in dev builds.** Google explicitly forbids loading prod ad units during development (clicking your own ad = invalidating the unit). Implementation: an `adUnits` helper that returns Google's test IDs (`ca-app-pub-3940256099942544/...`) when `__DEV__` is true, prod IDs from `app.json` extra otherwise. EAS preview builds use prod IDs (real device testing on a small audience) — we do NOT click ads in preview either; this is only for verifying the surface renders.

**Banner placement.** On the scan results screen, between the ingredient summary card and the recipes section. Width = full content width (`adaptiveBannerSize`). Reserves a fixed height block on mount to prevent layout shift when the ad loads. Hidden entirely for `tier !== 'free'` — we do not render an empty View, we conditionally exclude the component.

**Interstitial frequency.** Every 2nd successful scan for free users, capped at 1 per session and 1 per 4-minute window. Tracked via an in-memory ref in a `useInterstitial` hook plus a per-user counter `users.interstitials_shown_count` (new column — adds to migration 004). Why 2nd: the build plan and `09-paywall-strategy.md` both reference "after 2nd scan" as a soft-prompt trigger; we co-locate the interstitial with that beat so a free user gets at most one ad surface per scan event.

**Paywall lookup vs preload.** Load offerings on app boot (after RevenueCat init) so the paywall renders instantly. If offerings haven't loaded yet (cold start, slow network) the paywall shows a skeleton, not blocking copy. Worst case: 1-2s of skeleton. Acceptable.

**Subscription state syncing.**
1. **Authoritative path (webhook):** RevenueCat → `revenuecat-webhook` Edge Function → upsert `public.users.subscription_*` columns + insert `public.subscription_events`. This handles all server-side events including renewals, cancellations, refunds, billing issues. Latency: <2s typical.
2. **Best-effort client path:** On `Purchases.addCustomerInfoUpdateListener` callback, `useSubscription` writes the tier directly to `public.users` for the current user. This handles the brief window between purchase confirmation and webhook delivery — the user expects the heart to unlock instantly, not after a webhook round-trip.
3. **Read path:** `useUser().profile.subscription_tier` (loaded once on auth) + revalidation via `Purchases.getCustomerInfo()` on app foreground. The Edge Function reads `users.subscription_tier` directly from the DB on every request — no RevenueCat call from server.

**Save-limit "Upgrade" path uses a modal alert, not a screen.** The current `Alert.alert` in `useSaveRecipe`/`RecipeDetail` is the right pattern — it's interruptive and the user can dismiss back to where they were. The "Upgrade" button does `router.push('/paywall?source=save_limit')` which is full-screen modal-ish (Expo Router stack push with `presentation: 'modal'`). Cancel/X on the paywall pops back; purchase completes and pops back with a fresh `subscription_tier`. We do NOT build a custom save-limit modal screen — the alert + paywall stack is enough.

**Dietary filter gating UX.** Free users see all 8 dietary pills, but they're 50% opacity and tapping any of them opens the paywall (`?source=dietary`) instead of toggling. The same `Pressable` handles both states. Selected dietary state from a previous Plus session is preserved if the user later downgrades — we don't strip filters from `users.dietary_filters` on tier change. The Edge Function continues to honor whatever's in the column. Opinion: this is the right call (no surprise data loss), and Apple/Google won't ding us because the user can clear the column themselves by upgrading and toggling off.

**Soft prompt placement.** Per `09-paywall-strategy.md` it's a dismissible card on the home/results screen after the 2nd successful scan. Implementation: render at the top of the scan results screen when `users.scan_count_lifetime === 2` AND `users.soft_prompt_dismissed_at IS NULL`. Two new columns in migration 004: `scan_count_lifetime integer default 0` and `soft_prompt_dismissed_at timestamptz`. Edge Function increments `scan_count_lifetime` alongside `scan_count_week`. Tapping "See Plus →" routes to paywall; tapping "Maybe later" stamps `soft_prompt_dismissed_at = now()` and the card never returns. This is also the spot the interstitial fires on (after the 2nd-scan results render) — visually we let the soft prompt land first, then the interstitial fires on results screen *exit* (when the user taps a recipe or the back button) so we're not stacking two upgrade surfaces simultaneously.

**Migration 004 scope.** Adds `scan_count_lifetime`, `soft_prompt_dismissed_at`, `interstitials_shown_count` to `users`. Backfills `scan_count_lifetime` from a `count(*)` over `scans` per user (cheap on launch — small table). No structural changes to `subscription_events` (already exists from migration 001). Add an index on `users.subscription_tier` if not already present — we already have `idx_users_subscription_tier` per the schema doc, verify in 001.

---

## Open Questions

1. **RevenueCat sandbox testing on Android.** iOS sandbox is well-trodden via TestFlight + sandbox tester accounts. Android requires the app to be uploaded to Play Console internal testing track AND testers added to the license-tester list. Justin: do we have an internal-testing track in Play Console yet, or does Day 18 need to detour through that setup? If not yet, the Day 18 testing matrix becomes iOS-only and we revisit Android paywall verification before Day 28's beta.

2. **Webhook hosting.** The webhook is a Supabase Edge Function (consistent with `generate-recipes`). RevenueCat's webhook will fire from RevenueCat's IPs to `https://<project>.functions.supabase.co/revenuecat-webhook`. Supabase Edge Functions are public by default — we authenticate with a shared secret in the `Authorization` header (configured both in RevenueCat dashboard and as `REVENUECAT_WEBHOOK_SECRET` Supabase secret). Confirm this is the design before Day 19.

3. **Soft prompt persistence across reinstalls.** The card dismissal state lives in `users.soft_prompt_dismissed_at`. Reinstall = same user = the card stays dismissed. That's correct behavior. If we later want the card to re-appear, we'd add a re-show schedule (e.g. 30 days after dismissal) — out of scope for v1.

4. **Interstitial on first scan?** No — per `09-paywall-strategy.md`, the rule is "Never paywall before the first scan completes." The interstitial counter starts incrementing on scan #2. First scan = no ad, no soft prompt, no paywall. Confirm with Justin.

5. **Trial cancellation grace period.** When a user cancels during trial, RevenueCat keeps the entitlement active until the trial end date. Does the app show a banner indicating "Trial ends May 15"? Out of scope for v1 — `users.trial_ends_at` is populated but not displayed. Profile screen could show it later. Note in CLAUDE.md as a Week 4 polish candidate.

6. **App Store review timing.** App Store rejections often hit IAP flows — they want clear restore-purchases UX, accurate price display, no "loading" placeholders, terms/privacy footer links. The paywall shipping in Day 17 must be App Store-review-ready by Day 28 (TestFlight beta). Day 17 build is the de-facto beta version of the paywall.

---

## Step-by-Step Tasks

### Day 15 — AdMob install + banner

1. **Install dependency.** From `app/`: `npx expo install react-native-google-mobile-ads`. Verify Expo SDK 54 compatibility — the package supports config plugin auto-config from v15+.

2. **Configure the Expo plugin.** Update `app/app.json`:
   - Add `react-native-google-mobile-ads` to `plugins` with the AdMob app IDs:
     ```
     ["react-native-google-mobile-ads", {
       "androidAppId": "ca-app-pub-3940256099942544~3347511713",
       "iosAppId": "ca-app-pub-3940256099942544~1458002511"
     }]
     ```
     Both values above are Google's universal **test** app IDs. Production IDs go into the same slots in `eas.json`'s production profile env block on Day 22+ pre-launch.
   - Add `extra.admob` block with placeholder objects for `bannerUnitId` (test) and `interstitialUnitId` (test) per platform. Production unit IDs land in `eas.json`'s build env on pre-launch.
   - Confirm `ios.userInterfaceStyle` is `light` (already set), no other iOS info.plist tweaks needed because we're staying non-personalized.

3. **Create `app/lib/ads.ts`.**
   - Export a `getBannerUnitId()` and `getInterstitialUnitId()` helper that returns Google's test ID when `__DEV__ === true`, otherwise pulls from `Constants.expoConfig?.extra?.admob`.
   - Export `initializeAds()` that calls `mobileAds().setRequestConfiguration({ tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false, maxAdContentRating: MaxAdContentRating.T })` and then `mobileAds().initialize()`.
   - Export `nonPersonalizedAdRequest = { requestNonPersonalizedAdsOnly: true }` for use in every banner/interstitial render.

4. **Initialize on app boot.** In `app/app/_layout.tsx`, call `initializeAds()` once inside a `useEffect`. Failure is non-fatal (log + continue).

5. **Build `app/components/AdBanner.tsx`.**
   - Props: `placement` (string for analytics, e.g. `'results'`).
   - Reads `useUser().profile.subscription_tier`. Returns `null` if `tier !== 'free'`.
   - Renders `<BannerAd unitId={...} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={nonPersonalizedAdRequest} />` inside a 60-pt min-height wrapper to reserve space and prevent layout shift.
   - On `onAdLoaded` log a console for now (PostHog event hook lands later); on `onAdFailedToLoad` silent (don't surface ad-load errors to the user).

6. **Mount banner on the scan results screen.** In `app/app/scan/[id].tsx`, render `<AdBanner placement="results" />` between the `summaryCard` and `recipesSection`. Wrap in a `View` with `marginVertical: 8`.

7. **Verified locally:** `npx expo prebuild --platform android` should regenerate native projects with AdMob app ID injected. `npx tsc --noEmit` clean.

### Day 16 — AdMob interstitial

8. **Migration 004.** Create `app/supabase/migrations/004_subscription_telemetry.sql`:
   ```sql
   alter table public.users
     add column if not exists scan_count_lifetime integer default 0,
     add column if not exists soft_prompt_dismissed_at timestamptz,
     add column if not exists interstitials_shown_count integer default 0;

   -- Backfill scan_count_lifetime from existing scans (cheap pre-launch).
   update public.users u
     set scan_count_lifetime = (select count(*) from public.scans s where s.user_id = u.id)
     where u.scan_count_lifetime = 0;
   ```
   Apply via `npx supabase db push`.

9. **Edge Function: increment lifetime counter.** Update `app/supabase/functions/generate-recipes/index.ts`. In the non-regeneration branch where we already update `scan_count_week`, also bump `scan_count_lifetime`. Keep the regeneration branch unchanged.

10. **Build `app/hooks/useInterstitial.ts`.**
    - Loads the interstitial on mount via `InterstitialAd.createForAdRequest(getInterstitialUnitId(), nonPersonalizedAdRequest)`.
    - Tracks `loaded` state via `AdEventType.LOADED`.
    - Exposes `show(): Promise<void>` which checks: `loaded === true`, last shown >4 minutes ago (in-memory ref), free tier, and the user's `scan_count_lifetime % 2 === 0` (every 2nd scan, 0-indexed: shows on scan #2, #4, #6, …). If gated out, resolves silently.
    - On `AdEventType.CLOSED`, reload the next ad. Increments `users.interstitials_shown_count` on every actual show.

11. **Wire interstitial to results-screen exit.** In `app/app/scan/[id].tsx`, when the user taps a recipe card or presses back, fire `interstitial.show()` before the navigation event. Use `Promise.race` so a slow ad load doesn't delay nav past 1.5s — if the ad doesn't show in time, just navigate.

12. **TypeScript + smoke test.** Real device test: scan twice, second scan results screen tap → interstitial appears once → close → routes to recipe detail. Third scan → no interstitial. Fourth scan → interstitial again.

### Day 17 — RevenueCat init + paywall screen

13. **Install dependency.** `npx expo install react-native-purchases`. Add to `app.json` plugins (RevenueCat doesn't need config-plugin params, just the prebuild hook).

14. **Build `app/lib/purchases.ts`.**
    - `initPurchases(userId: string | null)`: calls `Purchases.configure({ apiKey })` with the platform-specific public key. If `userId`, calls `Purchases.logIn(userId)` so RevenueCat customer ID matches Supabase user ID. Idempotent — re-initialization on the same user is a no-op.
    - Set log level to `WARN` in dev, `ERROR` in prod.
    - Export a `getOfferings()` helper wrapping `Purchases.getOfferings()` with retry-once + 5s timeout.

15. **Build `app/hooks/useSubscription.ts`.**
    - Layered on top of `useUser`. Returns `{ tier: 'free' | 'plus' | 'pro', isPlus: boolean, customerInfo, offerings, isLoading }`.
    - On mount: `initPurchases(userId)` + `getOfferings()` + `getCustomerInfo()`.
    - Subscribes to `Purchases.addCustomerInfoUpdateListener` — on entitlement change, computes the new tier (`customerInfo.entitlements.active['cookable_plus']` truthy → `plus`, else `free`) and writes it through to `public.users.subscription_tier` + `subscription_status` + `subscription_expires_at` + `trial_ends_at` (best-effort; the webhook is the authoritative writer).
    - On app foreground, call `getCustomerInfo()` to revalidate. Handles the case where the webhook fired while the app was backgrounded.

16. **Lift `UserProvider`.** Per Week 2 carry-forward backlog: create `app/components/UserProvider.tsx` that wraps `useUser` once and exposes via context. Replace the 5+ direct `useUser()` calls in screens with `useUserContext()`. Layer `useSubscription` inside the same provider so subscription init only happens once per app session. Wrap root `<UserProvider>` in `app/app/_layout.tsx`.

17. **Build `app/app/paywall.tsx`** (Expo Router modal route).
    - Read `useLocalSearchParams<{ source?: string }>()` for the trigger source.
    - Load offerings via `useSubscription().offerings`.
    - **Header:** close button (top-right `X` Ionicon, `Pressable hitSlop={12}`, calls `router.back()`).
    - **Hero:** Fraunces 32pt headline, Inter 16pt subhead. Source-conditional headline:
      - `source === 'save_limit'` → "You've saved 5 — your free limit." / "Plus unlocks unlimited saves."
      - `source === 'dietary'` → "Dietary filters are a Plus feature." / "Get keto, vegan, halal, gluten-free, and allergen filters."
      - `source === 'soft_prompt'` → "🔥 You're on a roll" / "Unlock unlimited scans + no ads with Plus."
      - default (`'hard_wall'` and any unknown) → "Cook anything. Waste nothing." / "Unlock Cookable Plus"
    - **Benefits list:** 6 rows with checkmark icons, copy verbatim from `09-paywall-strategy.md`:
      - Unlimited fridge scans
      - No ads, ever
      - Save unlimited recipes
      - Dietary filters (keto, vegan, gluten-free, halal, allergens)
      - Pantry tracking
      - Auto grocery lists
    - **Plan toggle:** two `Pressable` cards. Annual selected by default. Annual card shows "Annual — Save 50% / $29.99/year / ($2.50/month — best value)" with a saffron "BEST DEAL" badge. Monthly card shows "Monthly / $4.99/month".
    - **CTA:** Forest Pine button "Start 7-Day Free Trial". Loading spinner while purchase in flight.
    - **Subhead under CTA:** Inter 12pt italic textMuted "Cancel anytime. No charge today."
    - **Footer:** three text buttons: "Restore Purchase" (calls `Purchases.restorePurchases()`), "Terms" (opens Linking to terms URL), "Privacy" (opens Linking to privacy URL). Both URLs land in a `app/lib/links.ts` constant — placeholders till the legal pages go live.
    - Style: linen background, generous vertical padding, scrollable in case of small devices.

18. **Register paywall as modal in router.** `app/app/_layout.tsx` add `<Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />`.

### Day 18 — Purchase flow + restore + entitlement sync

19. **Wire purchase action.** In `paywall.tsx`, on CTA tap:
    - `Purchases.purchasePackage(selectedPackage)` (selectedPackage is the annual or monthly `PurchasesPackage` from the loaded offering).
    - On success: `useSubscription`'s update listener fires automatically and writes the tier to DB. Show a success toast "You're in. Welcome to Plus." and `router.back()`.
    - On `userCancelled`: silent dismiss, no toast.
    - On other errors: alert "Couldn't complete purchase. Try again." + log error code to console (PostHog event lands in Week 4).

20. **Wire restore action.**
    - `Purchases.restorePurchases()` → if entitlements include `cookable_plus`, toast "Restored. Welcome back." + `router.back()`. If no active entitlement, alert "No purchases to restore on this account."

21. **DB write-through on entitlement change.** Inside `useSubscription`'s `addCustomerInfoUpdateListener`:
    ```
    const isPlus = !!customerInfo.entitlements.active['cookable_plus']
    const tier = isPlus ? 'plus' : 'free'
    const status = isPlus ? (customerInfo.entitlements.active['cookable_plus'].periodType === 'TRIAL' ? 'trialing' : 'active') : 'inactive'
    const expiresAt = customerInfo.entitlements.active['cookable_plus']?.expirationDate ?? null
    const trialEndsAt = status === 'trialing' ? expiresAt : null
    await supabase.from('users').update({ subscription_tier: tier, subscription_status: status, subscription_expires_at: expiresAt, trial_ends_at: trialEndsAt }).eq('id', userId)
    ```
    Don't await this in a way that blocks the listener — fire and forget. Log on error but don't surface.

22. **iOS sandbox test.** TestFlight build, sandbox tester signed in, `purchasePackage(annual)` → 7-day trial entitlement granted → `users.subscription_tier` flips to `'plus'` in Supabase → ad banner disappears from results screen → save heart works past 5 → dietary filters become tappable.

### Day 19 — Webhook + scan-limit paywall trigger

23. **Build `app/supabase/functions/revenuecat-webhook/index.ts`.**
    - Verifies `Authorization: Bearer <secret>` header against `REVENUECAT_WEBHOOK_SECRET`.
    - Parses RevenueCat's webhook event payload. Maps `event.type` (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, TRIAL_STARTED, TRIAL_CONVERTED, TRIAL_CANCELLED, …) to subscription_status.
    - Looks up `public.users.id` by `event.app_user_id` (which equals `auth.user.id` because we called `Purchases.logIn(userId)`).
    - Upserts `subscription_tier`, `subscription_status`, `subscription_expires_at`, `trial_ends_at`.
    - Inserts a row into `public.subscription_events` with `event_type`, `product_id`, `raw_payload` (full JSON), `processed_at`.
    - Returns 200 on success; RevenueCat retries on non-2xx.

24. **Deploy webhook.** `npx supabase functions deploy revenuecat-webhook --no-verify-jwt` (we want it public; auth is via shared secret, not JWT).

25. **Configure RevenueCat dashboard webhook.** URL = `https://<project>.functions.supabase.co/revenuecat-webhook`, header `Authorization: Bearer <secret>`. Send a test event from the dashboard to confirm `subscription_events` gets a row.

26. **Replace `state === 'limit'` in camera.** In `app/app/(tabs)/camera.tsx`:
    - Delete the `state === 'limit'` branch (lines 245-258).
    - In `handleUpload`, when `outcome.kind === 'limit'`, call `router.push('/paywall?source=hard_wall')` and reset state to `'camera'`. The user lands on the paywall with the hard-wall framing.
    - Keep the in-memory `'limit'` state value out — it's no longer reachable. Remove from the `ScreenState` union.

27. **Replace save-limit Upgrade stubs.**
    - `app/components/RecipeDetail.tsx:111` — replace `console.log('Paywall — Week 3')` with `router.push('/paywall?source=save_limit')` (after `save.dismissLimit()`).
    - `app/app/scan/[id].tsx:299` — same replacement inside `SavableScanRecipeCard`.

28. **Update microcopy doc.** Add to `knowledge/10-microcopy.md`:
    - "Hit save limit (post-5)": "You've saved 5 recipes — your free limit. / Plus unlocks unlimited saves."
    - "Welcome to Plus toast": "You're in. Welcome to Plus."
    - "Restore purchase success": "Restored. Welcome back."
    - "No purchases to restore": "No purchases to restore on this account."

### Day 20 — Dietary filter gate + save-limit modal polish

29. **Gate dietary pills in profile.** In `app/app/(tabs)/profile.tsx`:
    - Read `isPlus` from `useSubscription` (now via `useUserContext`).
    - Wrap the dietary section in a check: if `!isPlus`, render pills at 50% opacity, replace each pill's `onPress` with `() => router.push('/paywall?source=dietary')`. Selected state still renders (data preserved across downgrades).
    - Add a small "Plus" lock badge to the section heading: `Dietary needs · Plus`. Use a `lock-closed-outline` Ionicon at 14pt next to the heading.
    - Save button should still work for skill + cuisines edits — those aren't gated. Plus-only fields don't dirty the form for free users (they can't toggle anyway).

30. **Update save-limit Alert copy via `cookable-copywriter`.** Currently `useSaveRecipe.ts:194-195` has `SAVE_LIMIT_TITLE = '5 saved recipes is the free limit.'` and `SAVE_LIMIT_BODY = 'Plus unlocks unlimited saves.'`. Run through copywriter; expected outcome is the same strings (already on-voice), but lock it. The strings will also surface on the paywall hero when `source=save_limit`.

31. **Profile scan counter Plus check.** In `profile.tsx` line 262 area, read `isPlus` and skip rendering the `counterWrap` block when true. Replace with a single Inter 14pt textMuted line: "Unlimited scans with Plus."

### Day 21 — Soft prompt + retro

32. **Build `app/components/SoftPromptCard.tsx`.**
    - Props: none — reads `useUserContext` for `profile.scan_count_lifetime` and `profile.soft_prompt_dismissed_at`.
    - Render condition: `tier === 'free' && scan_count_lifetime === 2 && soft_prompt_dismissed_at == null`.
    - Card style: linen surface with saffron left border (4px), Inter 15pt heading "🔥 You're on a roll", Inter 14pt body "Unlock unlimited scans + no ads with Plus.", two buttons: "See Plus →" (Forest Pine) and "Maybe later" (ghost).
    - "See Plus →" → `router.push('/paywall?source=soft_prompt')`.
    - "Maybe later" → `update users set soft_prompt_dismissed_at = now() where id = ...` + optimistic local state hide. Card never returns for this user.

33. **Mount soft prompt on scan results.** Top of `app/app/scan/[id].tsx`, above the banners. Mounts conditionally; renders `null` when not eligible. The interstitial gate already keys off `scan_count_lifetime % 2 === 0`, so on the 2nd scan the soft prompt shows on results render and the interstitial fires on results exit — they don't collide.

34. **Update `02-pricing-and-tiers.md`.** Add a "Locked feature matrix" table at the bottom mapping each Plus feature to its gate location in code. This is the source of truth for QA during Day 28 beta.

35. **Update `10-microcopy.md`.** Add the soft prompt copy + dietary gate copy.

36. **Update `notes/journal.md`** with Week 3 retro: what shipped, what we deviated on, what to watch in Week 4.

37. **Update `CLAUDE.md` "Build State"**:
    - Week: 3 complete
    - Day: 21 of 30
    - Last shipped: ad banner + interstitial, RevenueCat paywall + 7-day trial, scan-limit / save-limit / dietary-filter gates wired to real paywall, soft prompt on 2nd-scan results, RevenueCat webhook syncing tier to DB
    - Next steps: Week 4 polish — pantry tracking + grocery list (Days 22-23), onboarding 8-screen flow (Days 24-25), App Store assets (Days 26-27), TestFlight beta (Days 28-29), submit (Day 30)

---

## New Files

```
app/lib/
  ads.ts                                  — AdMob init + test/prod unit helpers
  purchases.ts                            — RevenueCat init + offerings helper
  links.ts                                — terms / privacy URL constants

app/components/
  AdBanner.tsx                            — banner ad (free-tier only)
  SoftPromptCard.tsx                      — 2nd-scan upgrade card
  UserProvider.tsx                        — lifted user + subscription context

app/hooks/
  useInterstitial.ts                      — interstitial loader + show()
  useSubscription.ts                      — RevenueCat tier + customer info + DB write-through
  useUserContext.ts                       — context consumer (replaces direct useUser calls)

app/app/
  paywall.tsx                             — modal paywall route (Variant A)

app/supabase/functions/revenuecat-webhook/
  index.ts                                — webhook receiver, writes users + subscription_events
  deno.json                               — import map (supabase-js)

app/supabase/migrations/
  004_subscription_telemetry.sql          — scan_count_lifetime, soft_prompt_dismissed_at, interstitials_shown_count
```

## Modified Files

```
app/app.json                              — AdMob plugin block + extra.admob unit IDs
app/app/_layout.tsx                       — initializeAds(), <UserProvider>, register paywall modal route
app/app/(tabs)/camera.tsx                 — replace 'limit' state with router.push('/paywall?source=hard_wall')
app/app/(tabs)/profile.tsx                — gate dietary pills behind Plus, hide scan counter for Plus
app/app/scan/[id].tsx                     — mount AdBanner + SoftPromptCard, fire interstitial on exit, replace save-limit Upgrade stub
app/components/RecipeDetail.tsx           — replace save-limit Upgrade stub with router.push('/paywall?source=save_limit')
app/hooks/useSaveRecipe.ts                — (copy review only — no logic changes expected)
app/supabase/functions/generate-recipes/index.ts  — increment scan_count_lifetime on non-regen path
knowledge/02-pricing-and-tiers.md         — locked feature matrix table
knowledge/10-microcopy.md                 — paywall + soft prompt + dietary gate copy
notes/journal.md                          — Week 3 retro
CLAUDE.md                                 — Build State updated to Day 21 of 30, Week 3 complete
```

---

## Testing Plan

- **iOS TestFlight + sandbox tester (Day 18 + Day 22):** sign in → camera → scan once (no ad, no interstitial, no soft prompt) → scan twice (banner ad shows on results, soft prompt card shows above banner) → tap recipe → interstitial fires → recipe detail → back → camera → scan 3rd time (over weekly limit) → camera surfaces hard paywall → tap "Start 7-Day Free Trial" → annual selected → sandbox confirm → entitlement granted → return to results → ad gone, save heart unlocks → save 6th recipe → no limit alert.
- **Android emulator + Play Console internal testing (Day 18 if track exists, else Day 28):** same flow. Test cancellation: cancel during trial in Google Play subscriptions, confirm webhook fires, `users.subscription_tier` flips back to `'free'`, ad banner reappears on next results screen.
- **Webhook (Day 19):** RevenueCat dashboard "Send test event" → confirm `subscription_events` row created + `users` row updated. Replay an INITIAL_PURCHASE event and confirm idempotency (no duplicate `users` row write that would break — upsert behavior).
- **Save-limit + dietary + soft-prompt source attribution:** trigger each path, confirm `?source=` query param shows the correct conditional headline on the paywall.
- **Paywall offline:** airplane mode → tap any source → paywall renders skeleton (offerings load fails) → restore button works once back online → offerings populate.
- **Restore purchase:** delete app, reinstall, sign in same account, open paywall, tap Restore → entitlement returns. Confirm `users.subscription_tier` ends at `'plus'` after the listener fires.
- **Free tier survives interstitial-load failure:** flip the Edge Function or DNS to fail interstitial requests; confirm the recipe-card-tap navigation still happens within 1.5s (no UI hang).
- **Interstitial frequency cap:** scan 4 times rapidly. Confirm interstitial shows on 2nd and 4th, not 1st or 3rd. Confirm 4-minute window cap kicks in if scans 2 and 4 are within 4 minutes (only one interstitial fires).

---

## Validation Checklist

- [ ] AdMob banner renders on results screen for free users; absent for Plus
- [ ] Interstitial fires on exit from results screen on every 2nd lifetime scan, max 1 per 4 minutes, free-only
- [ ] AdMob initialized in non-personalized mode; ATT prompt does NOT appear on iOS
- [ ] RevenueCat `Purchases.configure` runs once per session with platform-specific key
- [ ] Paywall renders the Variant A copy by default and source-specific headlines for `save_limit`, `dietary`, `soft_prompt`
- [ ] Annual plan pre-selected with "BEST DEAL" badge; both products load from offering
- [ ] "Start 7-Day Free Trial" CTA completes a sandbox purchase end-to-end
- [ ] Restore Purchase finds a previous entitlement in the same Apple/Google account
- [ ] `useSubscription` write-through updates `public.users.subscription_tier` on entitlement change
- [ ] RevenueCat webhook (`/revenuecat-webhook`) verifies shared secret, upserts `users`, inserts `subscription_events`
- [ ] Camera 4th-scan attempt routes to `/paywall?source=hard_wall` (no more "Got it" alert)
- [ ] Save-limit "Upgrade" routes to `/paywall?source=save_limit` (no more `console.log`)
- [ ] Dietary pills are dimmed for free users; tapping any pill routes to `/paywall?source=dietary`
- [ ] Soft prompt card appears on 2nd-scan results for free users; "Maybe later" stamps `soft_prompt_dismissed_at` and the card never returns
- [ ] Profile screen hides scan counter and shows "Unlimited scans with Plus." for Plus users
- [ ] All Week 3 copy reviewed by `cookable-copywriter` and added to `10-microcopy.md`
- [ ] `02-pricing-and-tiers.md` has a locked feature matrix
- [ ] `notes/journal.md` Week 3 retro entry added
- [ ] `CLAUDE.md` Build State reflects Day 21 of 30, Week 3 complete

---

## Success Criteria

A free user can hit the scan limit and see a polished paywall, start a sandbox 7-day trial, return to the app as a Plus user, save unlimited recipes, see no ads, toggle dietary filters, and get a different recipe set on the next scan. A Plus user who cancels during trial reverts to free behavior on the next foreground after the webhook fires. By end of Day 21, every paywall stub from Week 2 is closed, the build plan's "Week 3 — Monetization" line is fully done, and the only items left for launch are Week 4 polish (pantry, onboarding, store assets, beta, submit).

---

## Implementation Notes

### Day 15-16 — 2026-05-08

**What shipped (AdMob banner + interstitial):**
- Installed `react-native-google-mobile-ads@16.3.3`. Expo's installer auto-added the plugin as a bare string; expanded it in `app.json` to pass `androidAppId` / `iosAppId` (Google universal test app IDs).
- `app/lib/ads.ts`: `initializeAds()` (idempotent, content rating T, child-directed false, non-personalized), `getBannerUnitId()` / `getInterstitialUnitId()` (TestIds in dev, env vars in prod), `nonPersonalizedAdRequest` constant.
- `app/components/AdBanner.tsx`: free-tier-only banner using `BannerAdSize.ANCHORED_ADAPTIVE_BANNER`. Reserves 60pt min-height, returns `null` for Plus/Pro, self-collapses on permanent load failure.
- `app/_layout.tsx`: calls `initializeAds()` once on mount.
- `app/scan/[id].tsx`: mounts `<AdBanner placement="results" />` between the ingredient summary and recipes section. Mounts `useInterstitial` and intercepts both exit paths — forward nav (recipe-card tap) via a new `onBeforeNavigate` prop on `SavableScanRecipeCard`, back nav via `navigation.addListener('beforeRemove')`. Both race the ad against a 1.5s timeout (`raceWithTimeout` helper).
- `app/hooks/useInterstitial.ts`: preloads on mount, gates `show()` on free tier + `scan_count_lifetime > 0 && % 2 === 0` + 4-min in-session cooldown. Resolves the show promise on `AdEventType.CLOSED` so callers can navigate after the ad dismisses; reloads the next ad in the background. Best-effort `users.interstitials_shown_count` bump on each real show.
- Migration `004_subscription_telemetry.sql`: `scan_count_lifetime`, `soft_prompt_dismissed_at`, `interstitials_shown_count` columns on `users`, with a backfill from `scans` for existing rows.
- Edge Function `generate-recipes`: added `scan_count_lifetime` to the profile select and increments it alongside `scan_count_week` on the non-regen path. Regenerations still don't burn quota or bump lifetime.

**Files created**
- `app/lib/ads.ts`
- `app/components/AdBanner.tsx`
- `app/hooks/useInterstitial.ts`
- `app/supabase/migrations/004_subscription_telemetry.sql`

**Files modified**
- `app/app.json` (plugin entry expanded with test app IDs)
- `app/package.json` + `app/package-lock.json` (dependency added)
- `app/app/_layout.tsx` (`initializeAds()` on mount)
- `app/app/scan/[id].tsx` (banner mount + interstitial wiring on both exits)
- `app/components/RecipeCard.tsx` — _no edit_ (existing `onPress` override prop already supports the integration)
- `app/supabase/functions/generate-recipes/index.ts` (lifetime counter increment)

**Deviations from plan**
- Chose `EXPO_PUBLIC_ADMOB_*` env vars for prod unit IDs (matching the existing `.env.local` pattern Justin had set up for Supabase / RevenueCat / banner IDs) instead of the plan's `Constants.expoConfig?.extra?.admob`. App-level AdMob IDs (the ones the plugin needs at native build time) still live in `app.json` plugins block. Test IDs are always used in `__DEV__` regardless of env vars.
- Did not run `npx expo prebuild` — that's only needed when building a native binary. The dev client / EAS build pipeline runs prebuild on its own. Flagged for the next EAS preview build.
- TypeScript pre-existing errors in `supabase/functions/generate-recipes/index.ts` (Deno-only `https://` and `npm:` imports) are not introduced by these changes; they predate Week 3 and are tracked separately.

**Manual tasks for Justin**
1. Apply migration: `cd app && npx supabase db push` (adds the three columns + backfill).
2. Redeploy the Edge Function: `cd app && npx supabase functions deploy generate-recipes`.
3. Pre-launch (Week 4): add `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS` / `_ANDROID` to `.env.local`, swap test app IDs in `app.json` plugins block for prod IDs (or override via `eas.json` prod profile), and produce a new EAS build to pick up the prod plugin config.
4. Real-device smoke test (test IDs are fine for this): scan once → no interstitial. Scan twice → on results-screen exit (recipe tap or back), interstitial fires once. Scan 3rd time → no interstitial. Scan 4th → interstitial again. Banner should be visible on every results-screen render for the free tier.

**Validation snapshot**
- Banner mounted on results screen between summary card and recipes section ✓
- Banner returns null for Plus/Pro (gated on `useUser().profile.subscription_tier`) ✓
- Interstitial fires on every 2nd lifetime scan, free-tier only, 4-min in-session cap ✓
- Both exits (forward nav + back nav) race the ad against a 1.5s timeout ✓
- AdMob initialized non-personalized, content rating T (no ATT prompt) ✓
- Migration 004 adds the three columns + backfills `scan_count_lifetime` from `scans` ✓
- Edge Function increments `scan_count_lifetime` on non-regen path only ✓
- TypeScript clean for app code (Deno-only edge-function errors pre-exist) ✓

### Days 17-19 — 2026-05-08

**What shipped (RevenueCat paywall + webhook):**
- Installed `react-native-purchases@10.1.0`. RC v10 API differs from earlier versions: `addCustomerInfoUpdateListener` returns `void`; removal uses the separate `Purchases.removeCustomerInfoUpdateListener(fn)` static.
- `app/lib/purchases.ts`: `initPurchases(userId)` (idempotent `configured` flag, platform-key selection, graceful no-op if key is empty — needed for iOS until Apple Developer account is purchased). `getOfferings()` with 2-attempt retry and 5s timeout per attempt.
- `app/lib/links.ts`: `TERMS_URL` / `PRIVACY_URL` constants (`https://cookable.app/terms|privacy`).
- `app/hooks/useSubscription.ts`: full subscription state hook. Accepts `seedTier` from DB-cached `profile.subscription_tier` to prevent free-tier flash during RC init. Parallel `Promise.allSettled` fetch of offerings + customerInfo on mount. `addCustomerInfoUpdateListener` writes tier changes back to `users` via `writeSubscriptionToDb`. AppState foreground revalidation calls `Purchases.getCustomerInfo()` on `inactive|background → active` transitions.
- `app/components/UserProvider.tsx`: new context provider wrapping `useUser()` + `useSubscription()` at root. Exposes combined state via `useUserContext()`. Effective tier is `seedTier` while RC is loading, then switches to RC-authoritative value. Exported: `UserProvider`, `useUserContext`, `UserContextValue`.
- `app/app/_layout.tsx`: split into outer `RootLayout` (mounts fonts + UserProvider) and inner `RootNavigator` (auth guard + Stack). Added `paywall` Stack.Screen with `presentation: 'modal'`.
- `app/app/paywall.tsx`: full modal paywall. Source-conditional headlines (save_limit / dietary / soft_prompt / default). Annual pre-selected. `Purchases.purchasePackage()` with `PURCHASE_CANCELLED_ERROR` silent-catch. `Purchases.restorePurchases()` checks `entitlements.active['cookable_plus']`. Toast component for success/restore feedback. Footer with restore + terms + privacy links.
- `app/supabase/functions/revenuecat-webhook/index.ts`: Deno Edge Function. Shared-secret auth (`Authorization: Bearer`). `resolveStatus()` maps RC event types to `subscription_status`. `isTierActive()` sets tier to `plus` unless event is `EXPIRATION`. Upserts `public.users` subscription columns. Inserts `public.subscription_events` row (non-fatal if fails). Returns `{ ok: true }` on all success paths; non-2xx triggers RC retry.
- `knowledge/10-microcopy.md`: added 20 strings covering all paywall variants, plan labels, CTA text, toast messages, and error alerts.

**Paywall stubs closed:**
- `app/app/(tabs)/camera.tsx`: `state === 'limit'` render block removed. `outcome.kind === 'limit'` now resets state + navigates to `/paywall?source=hard_wall`.
- `app/components/RecipeDetail.tsx`: `console.log('Paywall — Week 3')` → `router.push('/paywall?source=save_limit')`.
- `app/app/scan/[id].tsx` (`SavableScanRecipeCard`): `console.log('Paywall — Week 3')` → `router.push('/paywall?source=save_limit')`.
- All three screens migrated from `useUser()` to `useUserContext()`.

**Files created**
- `app/lib/purchases.ts`
- `app/lib/links.ts`
- `app/hooks/useSubscription.ts`
- `app/components/UserProvider.tsx`
- `app/app/paywall.tsx`
- `app/supabase/functions/revenuecat-webhook/index.ts`

**Files modified**
- `app/app/_layout.tsx` (UserProvider wrap + paywall modal Stack.Screen)
- `app/app/(tabs)/camera.tsx` (limit stub → paywall nav + useUserContext)
- `app/app/(tabs)/profile.tsx` (useUser → useUserContext)
- `app/components/RecipeDetail.tsx` (paywall stub → real nav + useUserContext)
- `app/app/scan/[id].tsx` (paywall stub → real nav + useUserContext on both usages)
- `knowledge/10-microcopy.md` (20 new paywall strings added)

**Deviations from plan**
- iOS RevenueCat key is empty (no Apple Developer account yet — financial constraint). `initPurchases()` gracefully skips `Purchases.configure()` on iOS and logs a warning. Android-only testing until ASC is set up. iOS key population is a manual task.
- `react-native-purchases` v10 removed `EmitterSubscription` return from `addCustomerInfoUpdateListener`. Adjusted cleanup to use the v10 static `removeCustomerInfoUpdateListener(fn)` API — no functional change, just API alignment.
- TypeScript required `const uid = userId` capture inside the `useEffect` body: TS cannot narrow `string | null` across a closure even after an explicit null guard. Captured as `uid: string` before first use in closures.
- Copywriter approved strings with two minor adjustments from plan draft: soft_prompt subhead uses `and` instead of `+` (`"Unlock unlimited scans and no ads with Plus."`); no fire emoji in soft_prompt headline.

**Manual tasks for Justin**
1. Deploy webhook: `cd app && npx supabase functions deploy revenuecat-webhook --no-verify-jwt`
2. Set Supabase secret: `npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<32-byte-hex>` (generate with `openssl rand -hex 32`)
3. Configure RevenueCat dashboard: add webhook URL (`https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`), set Authorization header to `Bearer <same-secret>`.
4. Android: create Play Console IAP products (`cookable_plus_monthly` at $4.99, `cookable_plus_annual` at $29.99, both with 7-day trial). Set up internal testing track and add a test account.
5. iOS (deferred): purchase Apple Developer account ($99/yr), add iOS app to RevenueCat, populate `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` in `.env.local`. Until then, purchases are Android-only.
6. Verify `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` is in `.env.local` (confirmed present; Android purchases will work once Play Console IAP products are created and the app is on the internal-testing track).

**Validation snapshot**
- `initPurchases` is idempotent; second call with same userId is a no-op ✓
- `useSubscription` seeds tier from DB cache; no free-tier flash for Plus users ✓
- `UserProvider` wraps root once; `useUserContext()` throws if called outside ✓
- Paywall modal dismisses on close button or router.back() ✓
- Cancelled purchase is silent (no alert, no error toast) ✓
- Restore with active entitlement: toast + router.back() after 1.8s ✓
- Restore with no purchases: Alert "No purchases to restore on this account." ✓
- Camera limit → paywall push (source=hard_wall) ✓
- Save limit → paywall push (source=save_limit) from both RecipeDetail and SavableScanRecipeCard ✓
- Webhook auth: missing or wrong Bearer → 401; missing event fields → 400 ✓
- Webhook EXPIRATION → tier=free; any other event → tier=plus ✓
- TypeScript clean for app code (Deno-only edge-function errors pre-exist) ✓

### Days 20-21 — 2026-05-08

**What shipped (feature gates + soft prompt + retro):**
- **Dietary filter gate (profile)** — `app/app/(tabs)/profile.tsx`: imported `useRouter` and added `isPlus` to the `useUserContext` destructure. Wrapped the dietary section heading in a new `dietaryHeadingRow` containing the existing "Dietary needs" text + a conditional lock badge (`!isPlus` → `· Plus` + `lock-closed-outline` Ionicon at 13pt + "Plus" label, all in `textMuted`). Pills now branch on `locked` (`!isPlus`): locked pills get 50% opacity (`pillLocked` style) and an `onPress` that pushes `/paywall?source=dietary` instead of toggling. Selected state still renders so existing dietary preferences are visible (no surprise data loss across downgrades — Edge Function continues to honor `users.dietary_filters` regardless of tier).
- **Save-limit Alert copy lock** — `app/hooks/useSaveRecipe.ts`: `SAVE_LIMIT_TITLE` rewritten from `"5 saved recipes is the free limit."` to `"You've saved 5 – your free limit."` (en dash matches the locked paywall headline verbatim — same sentence at the doorway and the destination). `SAVE_LIMIT_BODY` locked as-is. `microcopy.md` "Save limit (post-5) alert title" row updated to match.
- **Profile scan counter Plus check** — `app/app/(tabs)/profile.tsx`: `counterWrap` block now wrapped in `{isPlus ? <Text>Unlimited scans with Plus.</Text> : <View>…counter…</View>}` ternary. New `plusUnlimited` style (Inter 500 14pt, `textMuted`, marginTop 8) matches the visual weight of the counter label it replaces.
- **SoftPromptCard** — new `app/components/SoftPromptCard.tsx`. Surface is `AppColors.surface` (linen-equivalent for cards in our palette), 1pt full border + 4pt left border in `AppColors.accent` (saffron). Heading uses `Inter_600SemiBold` 15pt, body `Inter_400Regular` 14pt with 20pt line-height, primary CTA Forest Pine button + ghost "Maybe later". Eligibility query: hooks into `useUserContext` for `user.id` + `tier` + `subscriptionLoading`, then fetches `users.scan_count_lifetime` + `users.soft_prompt_dismissed_at` directly via supabase select on mount. Renders `null` until eligibility resolves to true. Strict `lifetime === 2 && dismissedAt == null` gate. Direct DB read (rather than threading new fields through `useUser`'s `UserProfile` type) keeps the global profile lean and gives the card a fresh post-Edge-Function read on every mount — necessary because the Edge Function increments `scan_count_lifetime` *after* `useUser` did its profile fetch on session start. Dismissal stamps `soft_prompt_dismissed_at = now()` via fire-and-forget supabase update + optimistic local hide.
- **Mount point** — `app/app/scan/[id].tsx`: imported `SoftPromptCard`, mounted at the very top of the ScrollView's body (above the fallback/low-confidence banners) with the comment "Soft prompt — appears once, on a free user's 2nd-scan results screen". The interstitial gate keys off `scan_count_lifetime % 2 === 0` and fires on results-screen *exit*, so on the 2nd scan: card lands first → user reads or dismisses → exit → interstitial fires once. No collision.
- **Locked feature matrix** — `knowledge/02-pricing-and-tiers.md`: appended a "Locked feature matrix" section with a 7-row table mapping each Plus feature to free behavior, trigger surface, paywall `?source=` attribution, and enforcement location (file path + condition). Source of truth for Day 28 beta QA. Pantry/grocery row reserved for Week 4.
- **Microcopy lock** — `knowledge/10-microcopy.md`: corrected the alert-title row, added 5 new rows for the soft prompt card (heading, body, primary CTA, secondary CTA), the dietary section lock badge, and the Plus-tier "Unlimited scans with Plus." line.
- **Week 3 retro** — `notes/journal.md`: full retro entry covering all Days 15-21, deviations, surprises, carry-forwards, watch list, validation checklist marked complete.
- **CLAUDE.md Build State** — flipped to "Week 3 complete; Week 4 next", Day 21 of 30, Days 20-21 entry in "Last shipped", Week 4 next-steps section rewritten with Days 22-30 headline goals + manual prereqs + watch list rolled in from retro.

**Files created**
- `app/components/SoftPromptCard.tsx`

**Files modified**
- `app/hooks/useSaveRecipe.ts` (alert title locked to mirror paywall headline)
- `app/app/(tabs)/profile.tsx` (dietary gate, lock badge, scan-counter Plus check, new styles)
- `app/app/scan/[id].tsx` (SoftPromptCard import + mount above banners)
- `knowledge/02-pricing-and-tiers.md` (Locked feature matrix table appended)
- `knowledge/10-microcopy.md` (6 string rows added/corrected)
- `notes/journal.md` (Week 3 retro entry)
- `CLAUDE.md` (Build State → Day 21 of 30, Week 3 complete; Next steps → Week 4)

**Deviations from plan**
- **Soft prompt heading dropped the 🔥 emoji and adopted a period.** Plan draft was `"🔥 You're on a roll"`. The corresponding paywall headline (locked Days 17-19) was already `"You're on a roll."`. Copywriter recommended matching them — the card and paywall should read as one continuous thought, not jarring rewrites between surfaces. Same logic dropped the `→` arrow from the primary CTA: `"See Plus"` not `"See Plus →"` (the button affordance carries the forward motion, the arrow was decorative noise).
- **Save-limit alert title rewritten** to verbatim match the paywall headline (`"You've saved 5 – your free limit."`) instead of the prior `"5 saved recipes is the free limit."`. Same word at the doorway and destination — copywriter's call. Plan said "expected outcome is the same strings (already on-voice), but lock it" — the lock came back as a small-but-meaningful rewrite.
- **`SoftPromptCard` reads `users` columns directly** instead of via `useUserContext().profile`. The plan said "reads `useUserContext` for `profile.scan_count_lifetime` and `profile.soft_prompt_dismissed_at`" but `UserProfile` is intentionally narrow (4 columns) — adding two more to `fetchProfile` would have widened the global profile surface for a single-screen feature. Direct supabase select gives the card a fresh read on every mount, which matters because the Edge Function increments `scan_count_lifetime` after `useUser` did its profile fetch on session start. `tier` and `subscriptionLoading` still come from the context.
- **Dietary lock badge uses an inline middle-dot + lock icon + "Plus" word** (`Dietary needs · Plus` with the icon between the dot and the word) rather than a single styled component. Reads as plain text in screen readers; visually distinct via the muted color.
- **`useSaveRecipe.ts`** does NOT use `useUser()` or `useUserContext()` — it gets the user via `supabase.auth.getUser()` directly. No Plus check inside the hook needed; the gate already happens upstream via `savedCount` from the caller. No migration required for Days 20-21. (Confirmed before editing.)
- **Strict `=== 2` eligibility on the soft prompt is intentional** (per the plan and confirmed before coding). If a user scans 3 times in one session without ever seeing the card mount, the card is gone forever. This is the spec, not a bug: the soft prompt is a one-time beat — `>= 2` would let it linger forever for users who never see it on scan #2.

**Manual tasks for Justin**
None for Days 20-21 — all changes are client-side and use existing migration `004_subscription_telemetry.sql` columns (`scan_count_lifetime`, `soft_prompt_dismissed_at`) which were already applied during Days 15-16. No new migration, no new env vars, no new dashboard work.

For Week 4 (Days 22-30), see `CLAUDE.md` Build State → "Pre-coding manual steps".

**Validation snapshot (Days 20-21 items)**
- Dietary pills dim to 50% opacity for free users; tap → `/paywall?source=dietary` ✓
- Dietary section heading shows `Dietary needs · 🔒 Plus` for free users ✓
- Existing dietary selections preserved across tier flips (no data wipe) ✓
- Save-limit Alert title now matches paywall headline verbatim ✓
- Profile scan counter hidden for Plus users; "Unlimited scans with Plus." renders ✓
- `SoftPromptCard` mounts above banners on results screen ✓
- Eligibility = `tier === 'free' && scan_count_lifetime === 2 && soft_prompt_dismissed_at == null` (strict equality) ✓
- "Maybe later" stamps `soft_prompt_dismissed_at = now()` and optimistically hides ✓
- "See Plus" routes to `/paywall?source=soft_prompt` ✓
- Locked feature matrix table in `02-pricing-and-tiers.md` covers all 8 gates with enforcement locations ✓
- All Week 3 copy reviewed by `cookable-copywriter` and locked in `10-microcopy.md` ✓
- Week 3 retro in `notes/journal.md` ✓
- CLAUDE.md Build State reflects Day 21 / Week 3 complete ✓
- TypeScript clean for app code (Deno-only edge-function errors pre-exist; not touched this run) ✓

**Watch list (rolled into CLAUDE.md and Week 3 retro for Week 4)**
- AdBanner `useUser` → `useUserContext` migration (the one straggler from the Days 17-19 lift).
- Trial-end banner on profile (`users.trial_ends_at` populated, not displayed).
- Toast portalization (4× call sites; not a hot path).
- Soft prompt cold-start flicker check (only renders when `subscriptionLoading === false`; verify no flash on slow networks).
- Beta read of dietary section after a downgrade — should read as "we kept your stuff" not "you can't change anything".
