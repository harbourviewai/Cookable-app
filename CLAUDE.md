# Cookable

> Cook anything. Waste nothing.

This is the project workspace for **Cookable** — an AI app that turns whatever's in your fridge into 3 recipes you can cook tonight.

Claude Code operates as the build assistant inside this workspace. It has access to all knowledge docs, plans, notes, and the app codebase.

---

## Identity

**Owner:** Justin Booth (Harbourview AI / solo founder)
**Status:** Pre-build. Ready for development.
**Target launch:** ~30 days from build start
**Platforms:** iOS + Android via Expo (React Native)
**Markets:** US + Canada, English only

## North Star

Ship a polished MVP in 30 days that hits these gates:
- 4.5+ average rating in week 1
- 8-12% paywall to trial conversion
- 50-65% trial to paid conversion
- ~$600 MRR by month 3 (≈120 paying users)

Everything in this workspace exists to keep the build on schedule and on-brand.

## Build Priorities

1. **Camera → AI → Recipes** is the core magic loop. Ship that first, polish everything else around it.
2. **Editable ingredient list** is the safety net for AI errors. Non-negotiable.
3. **Paywall comes after the magic moment.** Never gate the first scan.
4. **Brand calm > brand loud.** Forest Pine + Saffron, food carries the warmth, UI stays calm.

---

## Workspace Structure

| Directory | Purpose |
|-----------|---------|
| `knowledge/` | Source of truth — the full build doc split into focused reference docs. Read by `/prime`. |
| `plans/` | Implementation plans created by `/create-plan`, executed by `/implement`. |
| `notes/` | Build journal, decision log, learnings, scratch notes. |
| `marketing/` | TikTok scripts, social copy, press list, launch playbook. |
| `assets/` | Brand assets — logo, icon, screenshots, color tokens. |
| `app/` | The Expo / React Native codebase. Empty until Day 1 of build. |
| `.claude/commands/` | Slash commands for this workspace. |
| `.claude/agents/` | Specialized subagents (e.g., `cookable-copywriter`). |

---

## Commands

| Command | Purpose |
|---------|---------|
| `/prime` | Initialize session — read CLAUDE.md, scan knowledge/, summarize state. Run this first every session. |
| `/create-plan` | Plan a non-trivial change (new feature, refactor, doc restructure) before touching files. |
| `/implement` | Execute a plan from `plans/`. |
| `/next-task` | Surface the next concrete task based on the 30-day build plan and current progress. |
| `/progress` | Snapshot of where the build stands vs. the 30-day plan and pre-launch checklist. |
| `/ship-check` | Run the pre-launch checklist (knowledge/16-pre-launch-checklist.md) against current state. Reports gaps. |

---

## Subagents

| Agent | Purpose | Tools |
|---|---|---|
| `cookable-copywriter` | Draft UI microcopy, paywall copy, push notifications, App Store copy, TikTok scripts in the Cookable voice. Enforces voice rules (sentence case, no banned words, no exclamation points except specific cases). | Read, Write |

---

## Voice Rules (memorize)

**Cookable IS:** Direct, warm, confident, practical, slightly clever, encouraging.
**Cookable IS NOT:** Vague, saccharine, cocky, aspirational, goofy, cheerleader-y.

- Sentence case for everything
- Contractions are fine
- No exclamation points except `Saved! ✓` style microcopy and recipe encouragement
- **Banned words:** amazing, delicious, yummy, scrumptious
- **Banned phrases:** "powered by AI", "AI-powered"
- Use "you" liberally
- Never use long dashes (--)

## Brand Quick Reference

- **Primary:** Forest Pine `#2D5F4E`
- **Accent:** Saffron `#E89B3C`
- **Background:** Linen `#FAF7F2`
- **Display font:** Fraunces (22pt+)
- **UI font:** Inter
- **Tagline:** Cook anything. Waste nothing.

Full brand system: `knowledge/12-brand-identity.md`

---

## Build State (update as you go)

- **Week:** 3 complete; Week 4 in progress (Days 22-25 done)
- **Day:** 25 of 30 (Days 8-14 done — Edge Function live, camera→results loop, ingredient editor + recipe detail, save/favorite, profile + scan counter; Days 15-16 done — AdMob banner + interstitial; Days 17-19 done — RevenueCat paywall + webhook; Days 20-21 done — feature gates + soft prompt + Week 3 retro; Days 22-23 done — Pantry tab + grocery list; Days 24-25 done — onboarding flow + anonymous first scan)
- **Last shipped:** 2026-05-13 — Recipe loading scene (Day 26 polish). `app/components/RecipeLoading.tsx` replaces the photo+spinner overlay during the `analyzing` phase with a branded full-screen Linen scene: Pine bowl + Saffron swirl composited from two independent PNGs (rendered via `tools/render-icons.mjs`), swirl on a 1.6s breathe loop, Fraunces caption cycling through four time-driven slots ("Looking at your fridge…" → "Spotting what you've got…" → "Building 3 recipes for you…" → "Finishing up your recipes…"). Reduce-motion + VoiceOver live region wired. Prior last shipped: Days 24-25 — 8-screen onboarding flow (see `notes/journal.md` for full detail).
- **Active blocker:** None. Android paywall testing needs Play Console internal-testing track + IAP products (`cookable_plus_monthly`, `cookable_plus_annual`). iOS deferred — no Apple Dev account (financial constraint); `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` empty; purchases are Android-only until resolved.
- **App codebase:** Expo project at `app/`. Profile + save/favorite + scan-counter all wired to `public.users` + `public.saved_recipes`. `RecipeDetail` shared between scan-detail and saved-detail. Saved-recipe lookup matches by `(user_id, scan_id, title)`. Most screens consume `useUserContext()`; one straggler — `AdBanner` still reads `useUser()` directly, not blocking, flagged for Week 4.
- **Ads contract (Day 15-16):** Test IDs in dev (`__DEV__ === true` always returns Google's universal test units). Production reads from `EXPO_PUBLIC_ADMOB_BANNER_ID_*` / `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_*` env vars (banner IDs in `.env.local`; interstitial IDs need adding pre-launch). App-level AdMob IDs in `app.json` plugins — currently test IDs; swap to prod via `eas.json` prod profile env. Non-personalized mode at SDK init (no ATT prompt). `useInterstitial` cadence: scan #2, #4, #6 … (`lifetime % 2 === 0 && > 0`), 1 per 4 min per session.
- **RevenueCat contract (Days 17-19):** Android key in `.env.local` as `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`. iOS key empty. `useSubscription` seeds from `profile.subscription_tier` to prevent flash. Webhook deployed as Supabase Edge Function (`--no-verify-jwt`), `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`. Entitlement: `cookable_plus`. Offerings: `default` with `cookable_plus_monthly` ($4.99) + `cookable_plus_annual` ($29.99), both 7-day trial.
- **Feature gate matrix:** Source of truth in `knowledge/02-pricing-and-tiers.md` "Locked feature matrix". Maps every Plus gate (scans, ads, saves, dietary filters, soft prompt, scan counter, future pantry/grocery) to its enforcement location and `?source=` paywall attribution. Update this table whenever a gate moves.
- **Accounts ready:** Apple Dev (no — financial constraint; deferred), Google Play (yes), Anthropic (yes), Supabase (yes), AdMob (yes), RevenueCat (yes), PostHog (yes), Domain (yes)
- **AI model in use:** `claude-sonnet-4-6` (knowledge docs reference 4.5 — 4.6 is current; migration 003 applied accordingly)
- **Auth flow:** Google sign-in uses the **implicit OAuth flow** (Hermes lacks `crypto.subtle` for PKCE S256). Week 4 polish — switch to PKCE via `react-native-quick-crypto` or `expo-standard-web-crypto`.
- **Edge Function regen contract:** `isRegeneration = scan.recipes !== null` → bypasses the 10-min cache lookup and skips both the scan-limit check and the `scan_count_week` increment. Quota is per-photo, not per-AI-call. Deployed to production 2026-05-07.
- **Pantry contract (Days 22-23):** Tables `pantry_items` / `grocery_lists` / `grocery_items` already exist in migration 001 (Day 22's planned migration 005 was not needed). Pantry auto-populate runs only on `tier === 'plus' && !isRegeneration`; upsert on `(user_id, ingredient_name)` against the partial unique index `idx_pantry_unique` (where `deleted_at is null`). Grocery list is single-active-list; `clearCompleted` either archives the whole list (`completed_at = now()`) when every item is checked, or deletes only the checked rows. Re-deploy `generate-recipes` to Supabase before the next Plus scan.
- **Onboarding contract (Days 24-25):** Anonymous Supabase auth must be enabled in the Supabase dashboard. Existing `handle_new_user` trigger in migration 001 creates `public.users` rows for all auth inserts and does not exclude anonymous users. Apply migration `005_onboarding_completed_at.sql` before testing fresh installs. App typecheck is clean for RN app code; `npm run typecheck` still reports expected Deno Edge Function errors because Supabase functions are included in the RN tsconfig.
- **App icon contract (2026-05-09):** SVG masters live in `app/assets/icon-source/` (master, adaptive-foreground, splash); rendered PNGs live in `app/assets/images/`. Re-render via `node tools/render-icons.mjs` (uses `sharp` devDep) any time the SVG changes. `icon.png` is flat RGB (no alpha — Apple requirement); `adaptive-icon.png` is transparent foreground scaled to the 66% Android safe zone, paired with `adaptiveIcon.backgroundColor: #2D5F4E` (Pine) in `app.json`; `splash-icon.png` is mono-Pine on transparent against the Linen splash bg. Spec source: `.claude/design-extract/cookable/project/Cookable App Icon.html`.

### Next steps — Week 4 (polish & ship, Days 22-30)
Per `knowledge/04-build-plan.md` steps 22-30. Plan to be written in a fresh `plans/2026-05-XX-week-4-polish-and-ship.md` before Day 22 code.

**Headline goals:**
1. **Pantry tracking + grocery list (Days 22-23)** — Plus-only feature. Pantry surface aggregates detected ingredients across scans + a grocery-list generator from missing-ingredient sets on saved recipes. Storage shape (new tables vs `pantry_items` JSONB on `users`) TBD in plan. Add to Locked feature matrix when wired.
2. **Onboarding 8-screen flow (Days 24-25)** — implemented. Fresh users see six pre-scan screens, first scan runs as anonymous, auth gate and soft paywall appear post-scan.
3. **App Store + Play Store assets (Days 26-27)** — next. Listing copy from `knowledge/11-app-store-listing.md`, 10 screenshots in all required sizes, ATT-free Privacy Nutrition Labels, Data Safety section, app icon all sizes, splash artwork.
4. **TestFlight beta + Play Console internal testing (Days 28-29)** — 10-20 testers each. Use `02-pricing-and-tiers.md` Locked Feature Matrix as the QA runbook. Bug-fix pass.
5. **Submit (Day 30)** — App Store Connect + Play Console submissions, allow 24-48h iOS review.

**Pre-coding manual steps (Day 22+ prerequisites):**
- Apple Developer account ($99/yr) — until purchased, iOS testing is blocked. Day 28 hard blocker if still missing.
- Play Console internal-testing track + IAP product creation (`cookable_plus_monthly` $4.99, `cookable_plus_annual` $29.99, both 7-day trial). Required before Android paywall sandbox testing.
- AdMob: pull prod interstitial unit IDs into `eas.json` prod profile env (banner IDs already wired).
- Legal: privacy policy + Terms of Service hosted at `cookable.app/privacy` and `/terms` (URLs already constants in `app/lib/links.ts`).
- Domain DNS for landing page + waitlist email capture.

**Watch list rolled in from Week 3 retro:**
- `AdBanner` `useUser` → `useUserContext` (one straggler from the Days 17-19 lift).
- Trial-end banner ("Trial ends May 15") on profile — `users.trial_ends_at` populated, not displayed.
- Toast portalization (4× call sites; not a hot path yet).
- iOS RevenueCat key population once Apple Dev is purchased.

Week 2 full plan: `plans/2026-05-06-week-2-core-magic.md` (archived complete).
Week 3 full plan: `plans/2026-05-08-week-3-monetization.md` (Days 15-21 implemented).

Update this section weekly or when state changes meaningfully.

---

## Critical Rule: Keep This File Current

Whenever you change workspace structure, add a command, change build priorities, or hit a milestone — update CLAUDE.md. This file is the single source of truth for every future session.

---

## Session Workflow

1. Start: Run `/prime`
2. Check status: Run `/progress` if it's been a while
3. Plan changes: Use `/create-plan` for anything non-trivial
4. Execute: Use `/implement` against the plan
5. Maintain: Update CLAUDE.md and knowledge docs as decisions get made
