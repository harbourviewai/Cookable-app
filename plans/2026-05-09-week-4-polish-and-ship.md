# Plan: Week 4 — Polish & Ship (Days 22-30)

**Created:** 2026-05-09
**Status:** Days 22-25 Implemented (Days 26-30 still Draft)
**Request:** Land the final five Week 4 streams — pantry tracking + grocery list (Plus), 8-screen onboarding flow with anonymous-first scanning, App Store + Play Store assets, beta testing, and store submission — closing the 30-day MVP build plan.
**Relevant knowledge docs:** 04-build-plan.md, 02-pricing-and-tiers.md, 03-mvp-scope.md, 06-database-schema.md, 08-onboarding-copy.md, 09-paywall-strategy.md, 10-microcopy.md, 11-app-store-listing.md, 12-brand-identity.md, 16-pre-launch-checklist.md

---

## Overview

Week 3 turned Cookable into a business — paywall, ads, gates, soft prompt all live. Week 4 turns it into something Apple and Google will accept and a stranger will install. By end of Day 30:

- **Pantry tab (Plus)** aggregates ingredients across scans, supports manual add/remove, shows expiring-soon flags. Free users hitting the tab see a paywall preview.
- **Grocery list (Plus)** generates from a saved recipe's missing ingredients, lives inside the pantry tab as a second view, supports check-off and clearing completed.
- **First-launch onboarding** runs the 6 pre-scan screens from `08-onboarding-copy.md`, performs the first scan as an anonymous Supabase user, then converts that anonymous account into Apple/Google on the post-scan auth gate. Skill + cuisine answers persist across the conversion.
- **Notification permission ask** lands on screen 5; permission state is recorded so we can ship a Sunday meal-plan reminder later.
- **App Store + Play Store assets** are produced and uploaded — listing copy, 10 screenshots in all required sizes, app icon and splash matching the brand system, Privacy Nutrition Labels (iOS), Data Safety section (Android).
- **Beta testing** runs 10-20 testers per platform via TestFlight + Play Console internal track, using `02-pricing-and-tiers.md` Locked Feature Matrix as the runbook.
- **Submission** happens Monday Day 30 — App Store Connect + Play Console — to allow 24-48h iOS review for a Tuesday launch.

By the build plan's Day 30 marker we've cleared every line in `16-pre-launch-checklist.md` that's a code or asset task. iOS submission is conditional on the Apple Developer account purchase (currently a hard blocker — see Open Questions).

## Current State

What exists entering Week 4:
- **Tabs:** 4-tab layout (Home, Scan, Saved, Profile). Adding a 5th tab is feasible per the layout file but starts to feel busy.
- **Auth:** Sign-in is mandatory before reaching the tabs. `_layout.tsx` redirects unauthenticated users to `/auth/sign-in`. There is no onboarding gate, no first-launch flag, no anonymous-auth surface.
- **Schema:** `pantry_items`, `grocery_lists`, `grocery_items` are documented in `06-database-schema.md` but not yet in any migration. Migrations 001-004 are applied.
- **`users` row:** Created on `auth.users` insert (assumed — confirm in migration 001 before Day 22 code lands). Has `skill_level`, `preferred_cuisines`, `dietary_filters`, no `onboarding_completed_at` flag.
- **Saved recipes:** `RecipeDetail` already renders a missing-ingredients section. No "Add to grocery list" affordance yet.
- **Edge Function:** `generate-recipes` does not currently insert into `pantry_items` — pantry doesn't exist server-side yet.
- **Store presence:** Bundle IDs are set (`com.harbourviewai.cookable` on both platforms). No Apple Developer account yet (financial constraint). Play Console exists; internal-testing track + IAP products not yet configured.
- **App icon + splash:** Currently using Expo defaults at `assets/images/icon.png` etc. — Forest Pine + Saffron brand artwork has not been produced yet. `12-brand-identity.md` recommends $300-500 designer engagement on Dribbble or 99designs; depending on how Justin's tracking against that, we may ship with a brand-correct typographic icon as a Plan B.
- **Privacy / Terms:** `app/lib/links.ts` already has `cookable.app/privacy` and `/terms` constants. The pages themselves are not yet hosted.
- **Watch list carry-overs from Week 3 retro:** `AdBanner` still uses `useUser` directly (should be `useUserContext`); trial-end banner not displayed; Toast portalization (4× call sites); iOS RevenueCat key empty.

### Stubs / gaps to close before submission
- `AdBanner.tsx` — migrate `useUser` → `useUserContext` (1-line change).
- `users.trial_ends_at` — surface a "Trial ends May 15" line on profile when populated.
- App icon + splash artwork (depends on Justin's designer track).

---

## Prerequisites Before Day 22 Code Can Land or Be Tested

These are manual / dashboard tasks that unblock specific days. None are coding work.

1. **Supabase Auth dashboard (before Day 24):**
   - Enable Anonymous Sign-In: Authentication → Providers → Anonymous → toggle on.
   - Confirm existing trigger that creates a `public.users` row on `auth.users` insert fires for anonymous users too. If it doesn't, Day 24 needs a migration tweak (see Step 21).
   - Apple Sign-In + Google OAuth providers stay configured exactly as they are — anonymous auth doesn't change them.

2. **Play Console (before Day 28):**
   - Create internal-testing track. Add 10-20 tester emails to the license-tester list.
   - Create IAP products: `cookable_plus_monthly` ($4.99 USD, 7-day trial), `cookable_plus_annual` ($29.99 USD, 7-day trial). Status "Active" once approved.
   - Confirm RevenueCat dashboard sees these products on the Android offering.
   - Upload first internal build via `eas build --profile preview --platform android` + `eas submit` (or manual `.aab` upload) on Day 28.

3. **Apple Developer account (hard blocker for Day 28-30 iOS work):**
   - Purchase Apple Developer Program ($99/yr) — until this lands, iOS testing and submission are blocked.
   - If still unpurchased on Day 28, drop iOS from the beta and submit Android-only on Day 30. Re-open iOS as a post-launch task.
   - Once purchased: create the iOS app in App Store Connect with bundle ID `com.harbourviewai.cookable`, configure subscription group `Cookable Plus` with the same two product IDs, populate `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` in `.env.local`.

4. **AdMob production unit IDs (before Day 28 production build):**
   - Pull production banner + interstitial unit IDs from the AdMob dashboard for both platforms (4 IDs total).
   - Add to `eas.json` production profile env block:
     - `EXPO_PUBLIC_ADMOB_BANNER_ID_IOS` / `_ANDROID`
     - `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS` / `_ANDROID`
   - Replace the test app IDs in `app.json` plugins block with prod app IDs (or override via `eas.json` extra). Test IDs stay in dev because `__DEV__` always returns Google's test units regardless.

5. **Domain + legal pages (before Day 30 submission):**
   - Privacy Policy hosted at `https://cookable.app/privacy` — generators like termly.io or freeprivacypolicy.com are fine; must list AdMob, RevenueCat, Anthropic API, Supabase as data processors.
   - Terms of Service hosted at `https://cookable.app/terms`.
   - Support email `support@cookable.app` resolving (forward to Justin's inbox is fine).

6. **Brand artwork (before Day 26):**
   - App icon 1024×1024 master + iOS export sizes + Android adaptive icon (foreground + background).
   - Splash screen artwork (or confirm we ship the existing linen background + bowl placeholder).
   - Per `12-brand-identity.md` — bowl + saffron steam swirl on Forest Pine. If designer hasn't delivered by Day 25, ship with a typographic icon (lowercase `cookable` wordmark Fraunces 600 on Forest Pine) as Plan B. Replace post-launch.

7. **Copy review with `cookable-copywriter` (before Day 24):**
   - Onboarding screen 1-8 copy (already locked in `08-onboarding-copy.md` — this is a confirmation pass, not a rewrite).
   - Pantry empty state, grocery list empty state, "added to grocery list" toast.
   - App Store long description final pass (already in `11-app-store-listing.md` — same confirmation pass).

---

## Proposed Changes

### Day 22-23 — Pantry tab + grocery list (Plus-only)

Add migration 005 with `pantry_items`, `grocery_lists`, `grocery_items` tables (already defined in `06-database-schema.md`). Build a `Pantry` tab with two segmented views: **Pantry** (aggregated ingredients with manual add/remove + expiring badges) and **Grocery** (a single active list with check-off + clear completed). Free users hitting the tab see a `PantryUpsell` component routing to `/paywall?source=pantry`. From `RecipeDetail`, missing-ingredients gain an "Add to grocery list" button (Plus-only — free users get the paywall). Edge Function `generate-recipes` upserts detected ingredients into `pantry_items` for Plus users on each scan (best-effort, non-fatal).

### Day 24-25 — Onboarding 8-screen flow + anonymous first scan

Add `app/app/onboarding/_layout.tsx` and 6 step screens. First-launch detection via AsyncStorage flag `cookable_onboarding_completed`. Screens 1-2 are intro, 3 is skill, 4 is cuisine, 5 is notification permission, 6 is the first-scan prompt. Tapping "Open Camera" on screen 6 calls `supabase.auth.signInAnonymously()`, persists in-flight onboarding answers (skill, cuisines) to the freshly-created anonymous `users` row, then routes to camera. The first scan runs against the anonymous user. Screen 7 is a modal that appears on the scan results screen prompting Apple/Google sign-in to "save these recipes" — implemented via `supabase.auth.linkIdentity()` so the anonymous user_id is preserved and the scan + prefs persist. Screen 8 is the soft paywall preview. After screen 7 completes, we stamp `users.onboarding_completed_at` and AsyncStorage flips the flag. New users post-launch run the full flow; existing accounts are auto-flagged as completed (one-line backfill in migration 005).

### Day 26-27 — Store assets

Capture 10 screenshots per platform via Detox or manual screen-recording from a seeded test account, in iOS sizes 6.7" + 6.5" + 5.5" and Android phone + 7" tablet + 10" tablet. Apply listing copy from `11-app-store-listing.md` to App Store Connect + Play Console. Fill iOS Privacy Nutrition Labels (Email, User ID, Photos, Usage Data, Diagnostics — all "Linked to user") and Android Data Safety section. Upload app icon + splash artwork (or Plan B typographic icon). Set categories (Food & Drink primary; Lifestyle secondary on iOS).

### Day 28-29 — Beta testing

EAS production-profile build for both platforms. Distribute via TestFlight (iOS, conditional on Apple Dev account) and Play Console internal track (Android). Recruit 10-20 testers per platform — close friends, food-loving acquaintances, the launch-week press list contacts who already follow the project. Use the Locked Feature Matrix in `02-pricing-and-tiers.md` as the QA runbook plus a one-page "what to try, what we want to know" doc. Triage bugs, fix the criticals, defer the polish.

### Day 30 — Submit

App Store Connect: upload final build, fill out review notes (sandbox account credentials, what to test, why we don't need ATT), submit. Play Console: promote internal-track build to production, fill content rating questionnaire, submit. Update `CLAUDE.md` Build State to "Submitted Day 30, awaiting review" and write the Week 4 retro in `notes/journal.md`.

---

## Design Decisions

**Pantry as a 5th tab vs. a profile sub-page.** A 5th tab makes the surface area discoverable for Plus users — pantry tracking is one of the four marquee Plus benefits and can't hide behind two taps in profile. The cost is a busier tab bar. We accept it. Ordering: Home / Scan / Pantry / Saved / Profile (centered Scan stays prominent; Pantry inserts before Saved because mental model is "what I have" → "what I cooked").

**Pantry view + Grocery view in one tab.** Two top-segmented views inside the Pantry tab (segmented control, not a swipe). Pantry on the left (default), Grocery on the right with a count badge. Users add to grocery from a saved recipe's missing-ingredients list; grocery shows up as a single active list. No multi-list management for v1 — `grocery_lists.completed_at` archives a list when "Clear completed" is tapped, opening a fresh list. Multi-list + named lists are Phase 2.

**Pantry auto-population is opt-in client-side, opt-out server-side.** When a Plus user runs a scan, the Edge Function upserts every detected ingredient into `pantry_items` with `added_via='scan'` and `scan_id=...`. No expiry date is set automatically — the user adds expiry dates manually if they care. Free users do not have pantry items written. The unique index `idx_pantry_unique on (user_id, ingredient_name) where deleted_at is null` means re-scanning the same fridge twice doesn't duplicate items — the Edge Function uses `upsert` with `on_conflict=user_id,ingredient_name`.

**Free-user pantry surface = paywall preview, not empty state.** When a free user taps the Pantry tab, they see a faux-pantry preview screenshot (3 stock items dimmed) with an overlay: "Pantry tracking is a Plus feature." + the standard CTA. No data writes for free users.

**Grocery list "Add missing ingredients" is Plus-only.** From `RecipeDetail`, the missing-ingredients section gets an "Add all to grocery list" button. Free users tapping it route to `/paywall?source=grocery`. This is the 8th gate to add to the Locked Feature Matrix.

**Onboarding via anonymous Supabase auth (not deferred-write-on-link).** `supabase.auth.signInAnonymously()` creates a real `auth.users` row with `is_anonymous=true`. Our existing trigger that creates the matching `public.users` row fires. Skill + cuisine answers from screens 3-4 are written to that row immediately (not held in AsyncStorage). On screen 7, `supabase.auth.linkIdentity({ provider: 'apple' | 'google' })` converts the anonymous user to a permanent one — the user_id is preserved, all their data (the just-completed scan, the prefs, the saved recipes) carries over. Cancelling the link gives them an anonymous account that persists across sessions until they convert; we accept the risk that an anonymous user can pile up scans on a device that, if uninstalled, loses everything. Tradeoff: this is the right product call per `08-onboarding-copy.md`'s "Auth happens AFTER first scan" rule, and Supabase has supported anonymous auth + linkIdentity since 2024. Alternative considered: write skill/cuisines to AsyncStorage, sign in only on screen 7, then flush — rejected because (a) the magic moment "your scan is saved" requires an existing user_id, and (b) it would re-create the user row with a different ID and orphan the scan that was already inserted.

**Onboarding screens 5 + 8 are non-blocking.** Screen 5 (notifications) — "Not now" routes to screen 6 normally; "Yes, remind me" calls `Notifications.requestPermissionsAsync()` and on grant we schedule a single weekly reminder for Sunday 5pm local. On deny, no nag, just continue to screen 6. Screen 8 (soft paywall preview) — "Continue with free" dismisses; "Try Plus Free 7 Days" routes to `/paywall?source=onboarding`. Neither blocks the user from reaching the home tab.

**No anonymous-user paywall.** Free anonymous users do **not** get a paywall on the 4th scan — they get the existing hard-paywall route (`/paywall?source=hard_wall`) but the paywall has a banner "Sign in to subscribe" with Apple/Google buttons that link the anonymous identity first. The reason: RevenueCat needs a stable `app_user_id` to attach an entitlement to, and we set that to `auth.user.id`. If the user purchases as anonymous, the entitlement attaches to an anonymous ID that gets thrown away when they later sign in with Apple — we'd have to manually merge entitlements server-side. Cleaner: require permanent identity for purchase. The existing post-scan auth gate makes this the natural flow anyway — by the time a user hits scan #4, they'll have already linked.

**First-launch detection.** AsyncStorage key `cookable_onboarding_completed` (boolean). On app boot, `_layout.tsx` reads the key. If unset AND no user session, show onboarding. If set OR user session exists, skip. This is durable across reinstalls because we also check `users.onboarding_completed_at IS NOT NULL` on session load — a user reinstalling with the same Apple ID won't re-run onboarding. Day 25 backfills `onboarding_completed_at = now()` for every existing row, so today's testers don't suddenly see onboarding.

**App Store ATT decision.** Per `11-app-store-listing.md`: AdMob non-personalized mode → no ATT prompt → no `NSUserTrackingUsageDescription` in `app.json` → no `requestTrackingPermissionsAsync()` call. Privacy Nutrition Labels declare data is "Linked to user" but "Not used to track." If Apple review rejects on this, we revisit; the spec deliberately ships without ATT.

**App icon Plan B.** If brand designer hasn't delivered by Day 25, ship with a typographic icon: lowercase `cookable` wordmark in Fraunces 600 on Forest Pine background, with a small Saffron dot on the second `o`. Generated programmatically (or in Figma) and exported as a 1024×1024 PNG. We can swap to the bowl + steam icon in v1.0.1 — App Store does not penalize an icon refresh.

**Beta runbook = Locked Feature Matrix + 5 narrative scripts.** Pure feature-by-feature QA misses the cross-feature interactions that find the real bugs (e.g. "scan as free, hit limit, paywall, sandbox-purchase, return to scan and confirm Plus state propagated everywhere"). We supplement the matrix with 5 short scripts: "first-launch onboarding", "free → Plus conversion", "save → grocery list → check off", "Plus → cancel → revert", "restore on reinstall". Testers run these end-to-end; the matrix is the granular checkbox sheet.

**Submission cadence.** Per the build plan, submit Monday for Tuesday launch. Day 30 is a Saturday on the 2026-05-30 calendar, so the actual Monday submission is 2026-06-01. Update CLAUDE.md to reflect the calendar slip if Day 30 lands mid-week. The 24-48h iOS review window is the hard constraint — Android promotion-to-prod is near-instant.

---

## Open Questions

1. **Apple Developer account.** Is the $99 going on the card before Day 28? If not, Day 28-29 iOS testing + Day 30 iOS submit collapse into post-launch tasks and we ship Android-only. Need a yes/no by Day 26 so I can plan the beta recruitment list accordingly. *Recommendation:* purchase by Day 26 if budget allows; if not, ship Android, market hard on Android via TikTok and Play Store ASO, fold iOS in 2-4 weeks later.

2. **App icon designer.** Where are we on the bowl + steam icon? If it's not ordered by Day 22, Plan B (typographic icon) becomes the path. *Recommendation:* order today on Dribbble or 99designs with a 5-day turnaround target. Brief is in `12-brand-identity.md`. Worst case we ship Plan B and refresh post-launch.

3. **Domain + legal pages.** `cookable.app` registered? Privacy Policy + Terms generated? If neither exists by Day 26, App Store will reject. *Recommendation:* this is the highest-leverage 2-hour task — register domain, run a generator, host on Vercel free tier (or even GitHub Pages), done. Don't let this slip.

4. **Anonymous auth + RLS.** The existing RLS policies on `users`, `scans`, `saved_recipes` use `auth.uid() = user_id`. Anonymous users have an `auth.uid()` so this should still work — but the `auth.users` insert trigger that creates `public.users` rows must not exclude anonymous users. *Action:* before Day 24 code, verify the trigger exists and includes anonymous users by running a manual `signInAnonymously()` test against the existing migration set. If it gates on `is_anonymous=false`, migration 005 needs to remove that condition.

5. **Pantry "expiring soon" semantics.** The `expires_at date` column lets a user set an explicit expiry, but the AI also flags "expiring soon" ingredients on each scan. Do we auto-fill `expires_at` from the AI's expiring flag? *Recommendation:* no for v1 — the AI's expiring flag is heuristic ("yogurt looks like it's been open a while"), not a real expiry date. We render the AI flag as a "Use soon" badge on items added via scan within the last 3 days; explicit `expires_at` overrides it. This keeps the data model honest.

6. **Grocery list integration with Find Best Deal (Phase 3).** Architecturally, do we want grocery items to carry a `source_recipe_id` and a `quantity` from day one so the Phase 3 "find cheapest store" feature has the data it needs? *Recommendation:* yes — `06-database-schema.md` already has both columns. We populate them on add-to-grocery from `RecipeDetail`. Cost is zero, Phase-3 unlock is free.

7. **TestFlight invitation copy + Play Console tester instructions.** Need a paragraph for testers explaining what to try and how to report bugs. *Action:* I'll draft this as part of the Day 28 work — short Notion page with the 5 scripts + a contact form. Send via TestFlight email + Play Console listing description.

8. **Submission risk: AdMob on review.** Apple has rejected apps for showing ads to users without an ATT prompt. We're betting on non-personalized mode being a clean exception. *Mitigation:* if rejected, add `NSUserTrackingUsageDescription` and `requestTrackingPermissionsAsync()` on first ad load, fall back to non-personalized if denied. ~30 min code change. Plan for it but don't pre-empt.

9. **Submission risk: subscription review.** Apple's IAP review checklist is strict — restore button must be visible on the paywall (✓ already), price must match what's in App Store Connect (✓), terms + privacy must link from the paywall (✓). Risk: missing trial terms disclosure. *Action:* before Day 30, audit paywall.tsx against Apple's [updated IAP review guidelines](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase) and add a "By starting your trial, you agree to our Terms" line under the CTA if missing.

10. **Notification scheduling on screen 5.** If we grant the permission, do we actually schedule the Sunday reminder, or is that polish for post-launch? *Recommendation:* schedule it. `expo-notifications` supports local recurring schedules; ~10 lines. Permission without notifications looks bad — it implies we're hoarding the permission for later marketing pushes.

---

## Step-by-Step Tasks

### Day 22 — Pantry data layer + tab shell

1. **Migration 005.** Create `app/supabase/migrations/005_pantry_grocery_onboarding.sql`:
   ```sql
   create table public.pantry_items ( … );
   create table public.grocery_lists ( … );
   create table public.grocery_items ( … );
   alter table public.users
     add column if not exists onboarding_completed_at timestamptz;
   update public.users set onboarding_completed_at = now() where onboarding_completed_at is null;
   -- RLS policies for the three new tables (read/insert/update/delete own rows).
   ```
   Apply via `npx supabase db push`. Verify the unique index on `pantry_items(user_id, ingredient_name) where deleted_at is null` prevents duplicates.

2. **`app/app/(tabs)/_layout.tsx`** — add a 5th tab: `pantry` between `camera` and `recipes`. Icon `archive-outline`. Label "Pantry". Tab order: Home / Scan / Pantry / Saved / Profile.

3. **Build `app/app/(tabs)/pantry.tsx`** — top-level screen.
   - Reads `useUserContext()` for `tier` and `user.id`.
   - If `tier !== 'plus'` → render `<PantryUpsell />` and return.
   - Segmented control at top: **Pantry** | **Grocery** (count badge on Grocery if items exist).
   - Renders `<PantryView />` or `<GroceryView />` based on selection.

4. **Build `app/components/PantryUpsell.tsx`**.
   - Faux pantry preview: 3 stock ingredient cards at 50% opacity (e.g. "Eggs · 6 left", "Milk · use soon", "Spinach").
   - Headline (Fraunces 22pt): "Track what you have."
   - Body (Inter 15pt): "Plus tracks every ingredient across your scans, flags what's about to go bad, and turns missing ingredients into a grocery list."
   - CTA: "Try Plus Free 7 Days" → `router.push('/paywall?source=pantry')`.

5. **Build `app/components/PantryView.tsx`**.
   - On mount: `supabase.from('pantry_items').select('*').eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: false })`.
   - Renders each item as a row: ingredient name, source badge (`scan` icon vs `manual` icon), quantity if present, expiring-soon badge if `expires_at` within 3 days OR if added_via=scan within last 3 days (per Open Question 5), trash icon to delete.
   - Empty state: "Your pantry's empty. / Run a scan and we'll start tracking."
   - Sticky "+ Add ingredient" button at bottom — opens a modal to manually add (name + optional quantity + optional expiry).
   - Pull-to-refresh.

6. **Build `app/components/GroceryView.tsx`**.
   - On mount: fetch the active list via `select * from grocery_lists where user_id = ? and completed_at is null limit 1`. If none, show empty state.
   - For active list: `select * from grocery_items where list_id = ? order by sort_order, created_at`.
   - Each row: checkbox, ingredient name, optional quantity, source recipe link if `source_recipe_id` is set ("from Lemon Pasta").
   - Tap checkbox → `update grocery_items set is_checked = !is_checked`.
   - "Clear completed" button — sets `grocery_lists.completed_at = now()` on the active list, optionally creates a new empty list lazily on next add.
   - Empty state: "Your grocery list is empty. / Tap 'Add to grocery' on a saved recipe's missing ingredients."

7. **TypeScript pass.** `npx tsc --noEmit` clean.

### Day 23 — Grocery integration + auto-populate from scan

8. **Edge Function pantry upsert.** Update `app/supabase/functions/generate-recipes/index.ts`. After successful recipe generation, if the user's `subscription_tier === 'plus'` AND `isRegeneration === false`, upsert each detected ingredient into `pantry_items`:
   ```ts
   await supabase.from('pantry_items').upsert(
     detected_ingredients.map(i => ({
       user_id: profile.id,
       ingredient_name: i.name.toLowerCase().trim(),
       quantity_estimate: i.quantity,
       added_via: 'scan',
       scan_id: scan.id,
     })),
     { onConflict: 'user_id,ingredient_name' }
   )
   ```
   Best-effort — log on failure, don't fail the function.

9. **`RecipeDetail` "Add to grocery" button.** In `app/components/RecipeDetail.tsx`:
   - In the missing-ingredients section, add a small "Add to grocery list" button at the section's footer.
   - Free user tap → `router.push('/paywall?source=grocery')`.
   - Plus user tap → ensure an active grocery_list exists for the user (insert if not), then bulk-insert the missing ingredients with `source_recipe_id = savedRecipe.id` and `quantity = ingredient.quantity`. Skip duplicates (server-side: a unique-by-(`list_id`, `ingredient_name`) check). Toast "Added 4 to grocery list ✓".

10. **`SavableScanRecipeCard` parity.** In `app/app/scan/[id].tsx` — the wrapper card around `RecipeCard` for unsaved scan-results recipes. The "Add to grocery" affordance should also work from the recipe detail bottom-sheet that opens from a card tap. Confirm `RecipeDetail` is the same component used in both places (it is, per Week 3 retro) — single edit covers both surfaces.

11. **Locked Feature Matrix update.** Append the Pantry + Grocery rows to the table in `knowledge/02-pricing-and-tiers.md`:
    ```
    | Pantry tab | Tab renders <PantryUpsell /> instead of pantry/grocery views | Pantry tab tap | pantry | Client — app/app/(tabs)/pantry.tsx (gates on tier !== 'plus') |
    | Grocery list (add to) | Tapping "Add to grocery list" on a missing-ingredients section routes to paywall | RecipeDetail missing-ingredients section | grocery | Client — app/components/RecipeDetail.tsx |
    ```

12. **Microcopy lock.** Add to `knowledge/10-microcopy.md`:
    - Pantry empty state title + body
    - Grocery empty state title + body
    - "Added N to grocery list ✓" toast template
    - "Use soon" badge label
    - Pantry paywall hero (`source=pantry`)
    - Grocery paywall hero (`source=grocery`)
    Run all through `cookable-copywriter` first.

13. **Paywall source-conditional headlines.** In `app/app/paywall.tsx`, add two new branches:
    - `source === 'pantry'` → "Track what you have."
    - `source === 'grocery'` → "Build your grocery list." (or whatever copywriter lands on)

14. **Real-device smoke test.** Plus user: scan a fridge → pantry tab shows the detected ingredients → save a recipe → tap "Add to grocery list" → grocery view shows them → check off two → "Clear completed" → list empties. Free user: tap pantry tab → upsell renders → tap CTA → paywall loads with pantry-source headline.

### Day 24 — Onboarding shell + screens 1-4

15. **AsyncStorage helper.** `app/lib/onboarding.ts` — `hasCompletedOnboarding(): Promise<boolean>` reads `cookable_onboarding_completed`; `markOnboardingComplete()` writes `'true'`. Use `@react-native-async-storage/async-storage` (already a transitive dep, but add directly via `npx expo install`).

16. **Onboarding gate in `_layout.tsx`.**
    - On mount, after fonts load, read AsyncStorage flag AND check `users.onboarding_completed_at` once we have a session.
    - Routing logic:
      - No session AND not completed → `/onboarding/welcome`
      - No session AND completed (returning user, signed out) → `/auth/sign-in` (existing behavior)
      - Session AND not completed (mid-flow drop, e.g. anonymous user re-launched the app between screens 6 and 7) → `/onboarding/welcome` (resume from screen 7 if scan exists; else from welcome)
      - Session AND completed → `/(tabs)`
    - Keep the existing `inAuthGroup` redirect logic for backward compat.

17. **Build `app/app/onboarding/_layout.tsx`** — Stack navigator with no header, linen background.

18. **Build `app/app/onboarding/welcome.tsx`** (Screen 1).
    - Hero: large logo (or wordmark), Fraunces 32pt headline "Cook anything. Waste nothing.", Inter 17pt subhead "Snap your fridge — we'll show you what you can cook tonight."
    - Forest Pine "Get Started" CTA → `/onboarding/how-it-works`.
    - Secondary text button "Already have an account? Sign in" → `/auth/sign-in` (skips onboarding for returning users; sets `cookable_onboarding_completed` flag on successful sign-in).

19. **Build `app/app/onboarding/how-it-works.tsx`** (Screen 2). Three icon + text rows per `08-onboarding-copy.md`. CTA "Continue".

20. **Build `app/app/onboarding/skill.tsx`** (Screen 3). Three tappable cards. Tap auto-advances and persists locally to a temporary `useOnboardingState` hook (in-memory + AsyncStorage backup).

21. **Build `app/app/onboarding/cuisine.tsx`** (Screen 4). Multi-select grid of 12 cuisines + "Surprise me with anything". CTA "Continue [N selected]" disabled until ≥1 selected.

22. **Trigger verification.** Before this day's testing: confirm the `auth.users` → `public.users` insert trigger exists (`select * from pg_trigger where tgrelid = 'auth.users'::regclass`). If not present, add to migration 005:
    ```sql
    create or replace function public.handle_new_user() returns trigger as $$
    begin
      insert into public.users (id, email) values (new.id, new.email)
      on conflict (id) do nothing;
      return new;
    end; $$ language plpgsql security definer;
    create trigger on_auth_user_created after insert on auth.users
      for each row execute function public.handle_new_user();
    ```

### Day 25 — Onboarding screens 5-8 + anonymous-auth flow

23. **Build `app/app/onboarding/notifications.tsx`** (Screen 5).
    - Visual: stylized notification preview ("🔔 Cookable / Sunday — what's in your fridge?").
    - "Yes, remind me" → `Notifications.requestPermissionsAsync()` → if granted, schedule a weekly Sunday 5pm local trigger via `Notifications.scheduleNotificationAsync({ content: { title: 'Cookable', body: "Sunday — what's in your fridge?" }, trigger: { weekday: 1, hour: 17, minute: 0, repeats: true } })`. Continue to screen 6 either way.
    - "Not now" → continue to screen 6.

24. **Build `app/app/onboarding/first-scan.tsx`** (Screen 6).
    - Camera icon with subtle pulse, "Ready to cook?" headline, "Tip:" disclosure.
    - "Open Camera" CTA → check session: if none, `await supabase.auth.signInAnonymously()`, then write skill + cuisines to `public.users` for that new uid, then `router.push('/(tabs)/camera?source=onboarding')`.
    - "Use a saved photo" CTA → same flow but jumps to image picker.
    - Hand-off to camera: passing `?source=onboarding` lets the camera screen know to invoke the auth-gate modal on results render.

25. **Build `app/components/PostScanAuthModal.tsx`** (Screen 7).
    - Renders as an Expo Router modal route at `app/app/onboarding/auth-gate.tsx` so the recipe results screen stays visible behind it.
    - Apple/Google buttons. Order: Apple first on iOS, Google first on Android.
    - On tap → `supabase.auth.linkIdentity({ provider })` (existing OAuth flow). On success: stamp `users.onboarding_completed_at = now()`, mark AsyncStorage, dismiss modal.
    - "Maybe later" → dismiss without converting. Anonymous user persists. Mark AsyncStorage as completed (we won't re-prompt).

26. **Mount auth gate on first-scan results.** In `app/app/scan/[id].tsx`, on mount check if `route params include source=onboarding` AND user is anonymous (`user.is_anonymous === true` from Supabase). If so, after results render, push `/onboarding/auth-gate`. Only triggers once per scan (use a ref).

27. **Build `app/app/onboarding/soft-paywall.tsx`** (Screen 8).
    - Slide-up sheet over the recipes screen (75% height; use `presentation: 'transparentModal'` with backdrop).
    - "You're all set." headline. 4 benefit checkmarks. "Try Plus Free 7 Days" → `/paywall?source=onboarding`. "Continue with free" → dismiss + final `markOnboardingComplete()`.

28. **Re-test the full flow.** Fresh install (clear AsyncStorage in dev tooling) → screens 1-6 → camera → first scan completes → auth-gate modal → "Continue with Apple" → results screen visible with auth completed → soft paywall → dismiss → home tab. Re-run app: skips onboarding, lands on home tab.

29. **TypeScript + Edge Function smoke test.** Confirm the Edge Function accepts an anonymous user's JWT (Supabase signs anonymous users with the same JWT format; the `auth.uid()` check in RLS works identically).

### Day 26 — Store assets — copy, icons, splash

30. **Apply listing copy.** Copy from `11-app-store-listing.md` into App Store Connect (when account exists) and Play Console listing forms. iOS title/subtitle/keywords/long description, Android title/short/long. Categories: Food & Drink + Lifestyle (iOS).

31. **App icon + splash production.**
    - **If designer delivered:** Drop the 1024×1024 master into `app/assets/images/icon.png`, generate platform-specific sizes via `npx expo install expo-asset` + a one-off icon-generator script (or Expo's bundled tool). Adaptive icon: foreground PNG at `app/assets/images/adaptive-icon.png`, background hex `#2D5F4E` (Forest Pine) in `app.json`. Splash: artwork at `app/assets/images/splash-icon.png`, background `#FAF7F2` (Linen) — already correct in app.json.
    - **Plan B (typographic icon):** Generate via Figma or [favicon.io](https://favicon.io). Lowercase `cookable` in Fraunces 600, white text on Forest Pine, saffron dot on second `o`. Export 1024×1024. Apply same way.

32. **Privacy Policy + Terms hosting.** Generate via termly.io or freeprivacypolicy.com. Required disclosures: AdMob (advertising ID, ad data), RevenueCat (subscription metadata), Anthropic (image data — note retention policy), Supabase (account data, scans). Host on Vercel: `cookable.app/privacy` and `/terms`. Verify the URLs in `app/lib/links.ts` resolve.

33. **Privacy Nutrition Labels (iOS) draft.** Per `11-app-store-listing.md`:
    - Email Address — Linked, "App Functionality"
    - User ID — Linked, "App Functionality"
    - Photos — Linked, "App Functionality" (we send to Anthropic, retained per their policy ~30 days)
    - Usage Data (Product Interaction) — Linked, "Analytics"
    - Diagnostics (Crash Data) — Linked, "App Functionality"
    - All "Not used to track."

34. **Data Safety section (Android) draft.** Mirror the iOS labels. Add "Data is encrypted in transit" + "You can request your data be deleted (via support@cookable.app)".

### Day 27 — Store assets — screenshots

35. **Screenshot generation.** 10 screenshots per platform per `11-app-store-listing.md`. Approach:
    - Build a "screenshot mode" toggle in `app/lib/screenshot-mode.ts` — when env var `EXPO_PUBLIC_SCREENSHOT_MODE=true`, hide ad banners, hide soft-prompt, seed mock recipes from a fixture file. Avoids "scan a fridge 10 times trying to get the perfect Italian pasta result."
    - Run the build on real device + simulators of the right sizes (iOS 6.7" iPhone 16 Pro Max, 6.5" iPhone 11 Pro Max, 5.5" iPhone 8 Plus; Android Pixel 9 Pro phone, 7" tablet, 10" tablet).
    - Capture: camera viewfinder, 3-recipe results, ingredient editor, full recipe view, cuisine grid, paywall, pantry, grocery list, soft prompt, post-scan results.
    - Add captions per the table in `11-app-store-listing.md`.

36. **Optional: marketing-style framed screenshots.** If time, run captures through [previewed.app](https://previewed.app) or [appmocup](https://appmocup.com) to add device frames + caption overlays. Pure raw screenshots are fine for v1; framed is polish.

37. **Upload to consoles.** App Store Connect (when account ready) → all sizes. Play Console → phone + tablet sizes. Confirm review submission gates (icon, splash, screenshots, listing copy, privacy URLs) all show green.

### Day 28 — Production builds + beta distribution

38. **Production env + plugin config.**
    - Pull AdMob prod unit IDs into `eas.json` production profile env (4 IDs).
    - Replace test app IDs in `app.json` plugins.react-native-google-mobile-ads with prod app IDs.
    - Verify `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` is set; verify Apple key is set if iOS path is alive.
    - Bump `app.json` version to `1.0.0` (already there) and confirm `expo.runtimeVersion` is appropriate.

39. **EAS builds.**
    - `cd app && npx eas build --profile production --platform android` → outputs `.aab`.
    - `cd app && npx eas build --profile production --platform ios` → outputs `.ipa` (conditional on Apple Dev account).
    - `eas submit` for both, or upload manually to internal-testing/TestFlight.

40. **Tester recruitment + onboarding email.**
    - 10-20 testers per platform. Mix of: 5 close friends who'll actually try it, 5 food-loving acquaintances, 5 follower DMs.
    - Send a Notion link: 5-script runbook + bug report form (Tally or Google Form, simple).

41. **QA dry-run before tester invitations.** I personally run all 5 scripts on both platforms to catch the first wave of bugs before testers see them.
    - Script 1 — first-launch onboarding (anonymous → Apple link → soft paywall dismiss → home).
    - Script 2 — free → Plus conversion via 4th scan (sandbox tester account).
    - Script 3 — save a recipe → add missing to grocery → check off → clear.
    - Script 4 — Plus user → cancel during trial → verify revert on next foreground.
    - Script 5 — restore on reinstall.

### Day 29 — Bug fix pass

42. **Triage.** Read every bug report. Categorize: Critical (blocks core flow), Major (degraded UX), Minor (polish). Fix all Critical, fix high-leverage Majors, defer the rest to v1.0.1.

43. **Re-build + re-distribute.** New `eas build` if any code change lands. Push the new build to internal-test track / TestFlight. Notify testers.

44. **Final QA pass.** Run the 5 scripts again on the new build.

### Day 30 — Submit

45. **App Store Connect submission (conditional).**
    - Promote the latest TestFlight build to the App Store Connect submission queue.
    - Fill review notes: sandbox tester credentials, "non-personalized AdMob, no ATT", what to test, link to demo video if any.
    - Submit. Allow 24-48h.

46. **Play Console submission.**
    - Promote the latest internal build to the production track.
    - Fill content rating questionnaire.
    - Confirm Data Safety + Privacy Policy + IAP product list all green.
    - Roll out to 100% (or a 10% staged rollout if cautious). Submit.

47. **Update CLAUDE.md.** Build State → "Day 30 of 30 — submitted to both stores 2026-05-30. Awaiting review." Update Last shipped, Active blocker (review queue), Next steps (post-launch — TikTok push, micro-influencer DMs, Product Hunt prep).

48. **Write Week 4 retro.** `notes/journal.md` — what shipped, what slipped, what surprised, watch list for v1.0.1.

49. **Mark `16-pre-launch-checklist.md` items.** Tick off every checkbox that's actually done. Anything still unticked becomes a v1.0.1 task.

---

## New Files

```
app/app/onboarding/
  _layout.tsx                              — onboarding stack navigator
  welcome.tsx                              — Screen 1
  how-it-works.tsx                         — Screen 2
  skill.tsx                                — Screen 3
  cuisine.tsx                              — Screen 4
  notifications.tsx                        — Screen 5
  first-scan.tsx                           — Screen 6
  auth-gate.tsx                            — Screen 7 (modal)
  soft-paywall.tsx                         — Screen 8 (transparent modal)

app/app/(tabs)/
  pantry.tsx                               — Pantry tab top-level

app/components/
  PantryUpsell.tsx                         — free-tier paywall preview
  PantryView.tsx                           — pantry items list + manual add
  GroceryView.tsx                          — active grocery list + check-off
  PostScanAuthModal.tsx                    — Apple/Google link buttons (used by auth-gate.tsx)
  OnboardingProgress.tsx                   — small dots indicator across screens 1-6

app/hooks/
  useOnboardingState.ts                    — in-flight onboarding answers (skill, cuisines, notif perm)
  usePantry.ts                             — pantry items query + manual add/delete
  useGroceryList.ts                        — active list + items + add/check/clear

app/lib/
  onboarding.ts                            — AsyncStorage flag helpers
  notifications.ts                         — expo-notifications schedule helpers
  screenshot-mode.ts                       — fixture data for store screenshots

app/supabase/migrations/
  005_pantry_grocery_onboarding.sql        — pantry/grocery tables + onboarding_completed_at + auth.users trigger if missing
```

## Modified Files

```
app/app.json                               — prod AdMob app IDs (Day 28); maybe icon paths
app/eas.json                               — prod profile env vars (AdMob unit IDs, RC keys)
app/app/_layout.tsx                        — onboarding gate routing
app/app/(tabs)/_layout.tsx                 — pantry tab insertion
app/app/scan/[id].tsx                      — auth-gate modal trigger when source=onboarding
app/app/paywall.tsx                        — pantry/grocery source-conditional headlines
app/components/RecipeDetail.tsx            — "Add to grocery list" button
app/components/AdBanner.tsx                — useUser → useUserContext (Week 3 carry-over)
app/components/Toast.tsx                   — portalize if 4+ call sites confirm (carry-over)
app/supabase/functions/generate-recipes/index.ts  — pantry upsert for Plus users on non-regen scans
knowledge/02-pricing-and-tiers.md          — pantry + grocery rows in Locked Feature Matrix
knowledge/10-microcopy.md                  — pantry, grocery, "added to grocery" toast, Plan-B-icon nothing here
knowledge/11-app-store-listing.md          — final-pass copy lock (no logic change expected)
knowledge/16-pre-launch-checklist.md       — checkbox ticks on completed items
notes/journal.md                           — Week 4 retro
CLAUDE.md                                  — Build State → Day 30 of 30, submitted; Next steps → post-launch
```

---

## Testing Plan

### Pantry + Grocery (Days 22-23)
- **Plus user, fresh account:** Pantry tab empty state renders. Run a scan → pantry tab shows the detected ingredients with "Use soon" badges where the AI flagged expiring. Manually add "Salt", confirm row. Delete "Salt", confirm row removed.
- **Plus user, save flow:** Save a recipe with 3 missing ingredients → tap "Add to grocery list" → grocery view shows 3 items with the source recipe link → check off 1 → tap "Clear completed" → 1 item gone, 2 remain.
- **Free user:** Pantry tab → upsell renders. Tap CTA → paywall with `source=pantry`. Save a recipe → "Add to grocery list" → paywall with `source=grocery`.
- **Edge Function:** Run `select * from pantry_items where user_id = ?` after a Plus scan, confirm count matches detected ingredients. Run a regen on the same scan, confirm no duplicate inserts. Run a free-user scan, confirm no rows.
- **Cross-platform:** Same flows on iOS + Android.

### Onboarding (Days 24-25)
- **Fresh install (clear AsyncStorage):** Onboarding screens 1-6 render in order. Each tap advances. On screen 5, deny notifications → continue. On screen 6, "Open Camera" — confirm `auth.users` row created with `is_anonymous=true`, confirm `public.users` row created with skill + cuisines populated.
- **First scan as anonymous:** Camera permission grant → photo → upload → results render. Edge Function honors anonymous JWT. Auth-gate modal appears.
- **Apple/Google link:** Tap "Continue with Apple" → OAuth flow → return → modal dismisses → confirm `auth.users.is_anonymous=false` (or check `users.email` populated). Confirm `users.id` did NOT change. Soft paywall shows. Dismiss.
- **Re-launch:** App opens to home tab, no onboarding.
- **"Maybe later" on auth gate:** Anonymous user persists. Onboarding marked complete in AsyncStorage. Re-launch lands on home tab as anonymous. The 4th scan limit eventually triggers a paywall — confirm paywall shows "Sign in to subscribe" surface.
- **Cross-platform:** iOS uses Apple-first ordering; Android uses Google-first.

### Store assets (Days 26-27)
- All 10 screenshots upload without errors. App icon renders correctly at all sizes (iOS Settings icon, Spotlight, App Store; Android adaptive at all densities).
- Privacy Policy + Terms URLs return 200.
- App Store Connect "Prepare for Submission" page shows green for every asset.
- Play Console "Store listing" + "App content" + "Pricing & distribution" all green.

### Beta + bug fix (Days 28-29)
- Run all 5 scripts personally on both platforms before tester invitation.
- All 10-20 testers can install. At least 5 confirm "first scan worked, recipes looked reasonable."
- All Critical bugs fixed; bug list documented.

### Submit (Day 30)
- Both submissions accepted into review queue.
- Email notifications confirm receipt.

---

## Validation Checklist

### Code complete
- [ ] Migration 005 applied (pantry/grocery tables, onboarding_completed_at, trigger backfill)
- [ ] Pantry tab renders for Plus users with detected scan ingredients + manual add/remove
- [ ] Grocery tab renders the active list from saved-recipe missing ingredients with check-off
- [ ] Free users hitting Pantry tab see upsell, not data
- [ ] Free users tapping "Add to grocery list" land on `/paywall?source=grocery`
- [ ] Edge Function upserts pantry_items for Plus users on non-regen scans (and not for free users, not for regens)
- [ ] First-launch detection: AsyncStorage flag + DB column dual-check
- [ ] Onboarding screens 1-6 render the locked copy from `08-onboarding-copy.md`
- [ ] Notification permission ask + Sunday weekly schedule on grant
- [ ] Anonymous Supabase auth on screen 6 "Open Camera"
- [ ] First scan completes against anonymous user
- [ ] Auth-gate modal converts anonymous → Apple/Google via `linkIdentity()` preserving user_id
- [ ] Skill + cuisines persist across the conversion
- [ ] Soft paywall preview as screen 8
- [ ] AdBanner `useUser` → `useUserContext` migration
- [ ] Locked Feature Matrix has Pantry + Grocery rows

### Brand + voice
- [ ] All new copy reviewed by `cookable-copywriter`
- [ ] Sentence case, no banned words, no exclamation points outside allowed cases
- [ ] No "powered by AI" / "AI-powered" anywhere in store copy

### Store assets
- [ ] iOS title / subtitle / keywords / description applied verbatim from `11-app-store-listing.md`
- [ ] Android title / short / long description applied
- [ ] 10 screenshots uploaded in all required sizes per platform
- [ ] App icon (1024 master + sizes) + adaptive icon + splash artwork applied
- [ ] Privacy Policy + Terms hosted at the configured URLs and resolve
- [ ] iOS Privacy Nutrition Labels filled
- [ ] Android Data Safety section filled
- [ ] Categories set: Food & Drink (primary), Lifestyle (iOS secondary)

### Build + distribution
- [ ] Production AdMob unit IDs in `eas.json` and prod plugin config
- [ ] RevenueCat Android key populated; iOS key populated if Apple Dev account exists
- [ ] EAS production build succeeds for both platforms (iOS conditional)
- [ ] TestFlight / Play Console internal track has the latest build
- [ ] 10-20 testers per platform invited

### Submission
- [ ] App Store Connect submission entered review queue (or scheduled post-launch)
- [ ] Play Console production submission entered review
- [ ] CLAUDE.md Build State updated to Day 30
- [ ] Week 4 retro in `notes/journal.md`
- [ ] `16-pre-launch-checklist.md` checkboxes ticked

---

## Success Criteria

A first-time user opens Cookable, runs through 6 onboarding screens in under 60 seconds, scans a fridge as an anonymous account, sees 3 recipes that match their stated skill + cuisine, links Apple or Google to save them, dismisses a soft paywall preview, and lands on the home tab. A Plus user can scan, see the detected ingredients in their Pantry tab on the next visit, save a recipe, push its missing ingredients to a grocery list, check items off as they shop. Apple's review queue accepts the iOS submission (conditional on Apple Dev account); Google Play accepts the Android submission. By end of Day 30, every line in `04-build-plan.md` is implemented or explicitly deferred with a written reason, and Cookable is awaiting review for Tuesday launch.

---

## Implementation Notes

### Days 22-23 — Pantry tab + grocery list (Plus-only) — implemented 2026-05-09

**Shipped:**
- 5-tab layout: Home / Scan / Pantry / Saved / Profile (`archive-outline` icon).
- `pantry.tsx` top-level — gates on `tier !== 'plus'` → renders `PantryUpsell`. Plus users see a segmented control (Pantry / Grocery) with an active-item count badge on Grocery.
- `PantryView` — list of pantry items with source icon (camera = scan, pencil = manual), quantity, "Use soon" badge (per Open Question 5: scan-added items < 3 days old get the heuristic badge; explicit `expires_at` overrides). Pull-to-refresh, FAB-style "+ Add ingredient" button opening a modal (name + optional quantity). Optimistic delete with rollback.
- `GroceryView` — single active list with checkbox rows. Tap toggles `is_checked` optimistically. Source-recipe link rendered inline ("from Lemon Pasta") via the joined `saved_recipes(title)` selector. "Clear completed" appears as a footer pill when ≥1 item is checked; if all items checked → archive list (`completed_at = now()`); else delete only the checked rows.
- `usePantry` hook — query/refresh/manual-add (with soft-deleted reactivation handling) and remove.
- `useGroceryList` hook — lazy active-list creation, dedupe-by-(list_id, lowercased name) bulk add returning `{added, skipped}`, optimistic toggle, and the all-checked-vs-some-checked clear logic.
- Edge Function (`generate-recipes/index.ts`) — pantry auto-population: only on `tier === 'plus' && !isRegeneration`, deduped within the scan, upserted on `(user_id, ingredient_name)` with `added_via='scan'` and `scan_id=...`. Wrapped in try/catch — never fails the function. Free users and regenerations write nothing.
- `RecipeDetail` — "Add to grocery list" button below the missing-ingredients section. Free users → `/paywall?source=grocery`. Plus users → `useGroceryList.addToList()` with `source_recipe_id = save.savedId` (only populated for already-saved recipes; scan-detail unsaved recipes skip the back-reference). Toast: "Added N to grocery list ✓" or "Already on your list." for full duplicates. Same `RecipeDetail` is rendered from both `saved/[id].tsx` and `scan/[id]/recipe/[index].tsx` — single edit covers both surfaces.
- `paywall.tsx` — added `pantry` and `grocery` source branches with their own headlines/subheads.
- `knowledge/02-pricing-and-tiers.md` — Locked Feature Matrix has the placeholder "Pantry tracking + grocery list" row replaced by two real rows: Pantry tab (`pantry`) + Grocery list add-to (`grocery`).
- `knowledge/10-microcopy.md` — pantry/grocery copy block locked: empty states, badges, modal labels, paywall hero, upsell hero, toasts.

**Deviations from plan:**
1. **No migration 005.** The plan's Day 22 Step 1 instructed creating `005_pantry_grocery_onboarding.sql` to add the `pantry_items`, `grocery_lists`, `grocery_items` tables. These are already defined in `001_initial_schema.sql` (with the partial unique index on `(user_id, ingredient_name) where deleted_at is null`, RLS, etc.). No migration needed for Days 22-23. The `onboarding_completed_at` column + trigger verification will land in migration 005 alongside the Day 24 onboarding work.
2. **Pantry expiry input deferred.** The plan called for an optional expiry-date field in the manual-add modal. Skipped — the modal currently captures only name + quantity. Date pickers add a dependency (`@react-native-community/datetimepicker`) for a feature most users won't reach for in v1. Reopen if beta testers ask.
3. **Source recipe link gracefully degrades.** When "Add to grocery list" is tapped from a scan-detail recipe that hasn't been saved yet, items insert without `source_recipe_id`. The plan implied this came from a saved recipe only; the gentler behavior (still allow the add, just without back-ref) felt better than gating on save state. Documented in the Locked Feature Matrix Notes column.
4. **No "Add ingredient · Plus" lock UI.** Free users never reach the manual-add modal — `pantry.tsx` short-circuits to `PantryUpsell` long before the FAB renders.

**Validation:**
- TypeScript: `npx tsc --noEmit` clean for app code (Deno-runtime errors in `supabase/functions/` are pre-existing and expected — those files don't typecheck under the RN tsconfig).
- File-level checks: pantry tab, both views, both hooks, paywall branches, RecipeDetail integration, Edge Function upsert all written and wired.
- Real-device smoke test (deferred to first emulator run): Plus-tier flow (scan → pantry shows detected items → save recipe → "Add to grocery" → check off → "Clear completed" → list empties), free-tier flow (Pantry tab → upsell with `source=pantry`, "Add to grocery list · Plus" → paywall with `source=grocery`).

**Carry-forward:**
- Edge Function pantry upsert depends on the partial unique index `idx_pantry_unique`. PostgreSQL can use a partial index as the conflict target as long as the inserted row satisfies the predicate (`deleted_at is null`) — which is the case here since we never set `deleted_at` on insert. If supabase-js's `onConflict` argument doesn't transparently handle partial indexes in production, fall back to a manual select-then-insert path (the `addManual` hook already does this).
- The "Use soon" heuristic (scan-added < 3 days) is a placeholder for a future expiry-date editor on individual rows. The badge surface is wired, so adding edit-row UI later is purely client work.

### Days 24-25 — Onboarding 8-screen flow + anonymous first scan — implemented 2026-05-10

**Shipped:**
- `app/lib/onboarding.ts` — AsyncStorage helpers for `cookable_onboarding_completed`, local skill/cuisine draft answers, persistence to `public.users`, and completion stamping.
- `app/supabase/migrations/005_onboarding_completed_at.sql` — adds `users.onboarding_completed_at` and backfills existing rows.
- Root gate in `app/app/_layout.tsx` — checks AsyncStorage plus `profile.onboarding_completed_at` and routes first-launch users to `/onboarding/welcome`, signed-out completed users to `/auth/sign-in`, and completed sessions to tabs.
- Onboarding stack and screens: `welcome`, `how-it-works`, `skill`, `cuisine`, `notifications`, `first-scan`, `auth-gate`, `soft-paywall`.
- Screen 5 uses `expo-notifications`; permission grant schedules a weekly Sunday 5pm local reminder.
- Screen 6 creates an anonymous Supabase session with `supabase.auth.signInAnonymously()`, writes skill + cuisines to the anonymous `users` row, and routes to `/(tabs)/camera?source=onboarding`; saved-photo entry routes with `pick=library`.
- Camera preserves `source=onboarding` onto `/scan/[id]` after upload/generation.
- Scan results push `/onboarding/auth-gate` once for anonymous onboarding scans.
- `PostScanAuthModal` links Apple/Google via `supabase.auth.linkIdentity()`, stamps onboarding complete, then shows the soft paywall.
- `expo-notifications` added via `npx expo install expo-notifications`.

**Deviations from plan:**
1. **Trigger verification by source inspection, not live SQL.** Migration 001 already has `handle_new_user` + `on_auth_user_created` with no anonymous-user exclusion. Live Supabase SQL verification still needs to happen when applying migration 005.
2. **`linkIdentity()` flow is direct.** The modal calls Supabase `linkIdentity()` for Apple/Google. If provider-specific native linking needs the same custom implicit OAuth handling as sign-in, reuse the existing auth screen's callback parsing in a follow-up.
3. **Soft paywall is a modal route.** It uses Expo Router transparent modal presentation and returns to tabs/free or paywall as intended.

**Validation:**
- `npx expo install expo-notifications` completed and updated `package.json` / `package-lock.json`.
- `npm run typecheck` has no app-code errors. It still fails on pre-existing Supabase Edge Function Deno imports/types under the RN tsconfig (`generate-recipes`, `revenuecat-webhook`), matching the Days 22-23 validation note.
- Manual device smoke test still required: fresh install / clear AsyncStorage → screens 1-6 → anonymous camera scan → auth gate → Apple/Google link or maybe-later → soft paywall → relaunch skips onboarding.
