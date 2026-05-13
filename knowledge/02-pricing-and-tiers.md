# Pricing & Tiers

## Free

- 3 scans per week (resets Sunday)
- Save up to 5 recipes
- Banner ads + interstitial after recipe generation
- Skill + cuisine personalization
- All cuisine types

## Plus — $4.99/mo or $29.99/yr (50% annual discount)

- Unlimited scans
- No ads
- Save unlimited recipes + collections (folders)
- Dietary filters (keto, vegan, gluten-free, halal, dairy-free, nut allergy)
- Pantry tracking across scans
- Auto-generated grocery lists for missing ingredients

**Free trial:** 7-day free trial on both monthly and annual. Card required up-front (RevenueCat handles).

## Pro — Phase 2 only, NOT at launch ($9.99/mo or $59.99/yr)

Reserved for after MVP validates. Will include:

- Everything in Plus
- Meal planning (3/5/7-day plans)
- **Find Best Deal** — scans local grocery flyers/sites to find cheapest store for a saved recipe's ingredients
- Price drop alerts on saved recipes
- Family sharing (up to 4 accounts)

---

## Locked feature matrix

Source of truth for Day 28 beta QA. Each Plus feature, where it's enforced in code, what a free user sees when they hit it, and the paywall `?source=` attribution they land on. If a row here changes, the corresponding test case in the beta runbook must change too.

| Feature | Free behavior | Free trigger surface | Paywall source | Enforcement location | Notes |
|---|---|---|---|---|---|
| Unlimited scans | Hard cap at 3 / rolling 7-day window | Camera screen → upload returns `outcome.kind === 'limit'` → push to paywall | `hard_wall` | **Server** — `app/supabase/functions/generate-recipes/index.ts` (returns 402 when `tier === 'free' && !isRegeneration && effectiveCount >= FREE_SCAN_LIMIT`). Client surfaces in `app/app/(tabs)/camera.tsx`. | Regenerations don't burn quota (per the regen contract). |
| No ads (banner) | Banner ad on every results screen | `<AdBanner />` mounts; component returns null for non-free tiers | n/a (passive — no paywall trigger from the banner itself) | **Client** — `app/components/AdBanner.tsx` (gates on `useUser().profile.subscription_tier === 'free'`). | Test/dev unit IDs always used in `__DEV__`; prod IDs from env. |
| No ads (interstitial) | Interstitial after every 2nd lifetime scan, max 1 / 4 min | Fires on results-screen exit (recipe-card tap or back nav) | n/a (passive) | **Client** — `app/hooks/useInterstitial.ts` (gates on free tier + `scan_count_lifetime % 2 === 0` + 4-min cooldown). | Wired in `app/app/scan/[id].tsx`; raced against 1.5s timeout so a slow ad never blocks nav. |
| Unlimited saves | Hard cap at 5 saved recipes | Tapping the heart on the 6th recipe → `Alert.alert` ([Maybe later, Upgrade]) | `save_limit` | **Client** — `app/hooks/useSaveRecipe.ts` (returns `kind: 'limit_reached'` when `savedCount >= 5`). Surfaces in `app/components/RecipeDetail.tsx` and the `SavableScanRecipeCard` wrapper in `app/app/scan/[id].tsx`. | Server-side enforcement is a Phase 2 belt-and-braces add — client guard is sufficient for v1. |
| Dietary filters | All 8 dietary pills render at 50% opacity; tapping any pill opens the paywall instead of toggling | Profile → "Dietary needs" section | `dietary` | **Client** — `app/app/(tabs)/profile.tsx` (gates on `!isPlus`; existing selections preserved across downgrades; lock-closed-outline icon + "· Plus" badge in section heading). | Edge Function continues to honor whatever's in `users.dietary_filters` regardless of tier — no surprise data loss. |
| Soft prompt card | Dismissible upgrade card on results screen, eligibility = `tier === 'free' && scan_count_lifetime === 2 && soft_prompt_dismissed_at == null` | Top of `app/app/scan/[id].tsx`, above the banners | `soft_prompt` | **Client** — `app/components/SoftPromptCard.tsx` (queries `users.scan_count_lifetime` + `soft_prompt_dismissed_at` directly; returns null when ineligible). | "Maybe later" stamps `soft_prompt_dismissed_at = now()` — card never returns for that user. |
| Profile scan counter | "X of 3 scans used this week" + progress bar + reset date | Top of profile screen | n/a (passive) | **Client** — `app/app/(tabs)/profile.tsx` (gates on `isPlus`). Plus users see "Unlimited scans with Plus." instead. | — |
| Pantry tab | Tab renders `<PantryUpsell />` (faux preview + "Try Plus Free 7 Days" CTA) instead of pantry/grocery views; no pantry data is written for free users | Pantry tab tap | `pantry` | **Client** — `app/app/(tabs)/pantry.tsx` (gates on `tier !== 'plus'`). Server-side: `app/supabase/functions/generate-recipes/index.ts` only upserts to `pantry_items` when `tier === 'plus' && !isRegeneration`. | Auto-population is per-scan upsert keyed on `(user_id, ingredient_name)` — re-scanning the same fridge doesn't duplicate items. |
| Grocery list (add to) | "Add to grocery list · Plus" button on a recipe's missing-ingredients section routes to paywall instead of inserting items | `RecipeDetail` missing-ingredients section (rendered from both saved-detail and scan-detail surfaces) | `grocery` | **Client** — `app/components/RecipeDetail.tsx` (gates on `!isPlus`). Plus users hit `useGroceryList.addToList()` which lazily creates an active `grocery_lists` row and bulk-inserts deduped items with `source_recipe_id`. | Source-recipe link populates only when the recipe is already saved (`save.savedId != null`) — scan-detail unsaved recipes still add the items but without a recipe back-reference. |
