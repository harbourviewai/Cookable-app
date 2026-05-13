# Cookable — Master Build Doc

> Cook anything. Waste nothing.

A single source of truth for building Cookable: an AI app that turns whatever's already in your fridge into 3 recipes you can cook tonight, prioritizing ingredients about to expire.

**Status:** Pre-build. Ready for development.
**Owner:** Justin Booth
**Last updated:** April 30, 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Differentiation Wedges](#2-differentiation-wedges)
3. [Tier Structure & Pricing](#3-tier-structure--pricing)
4. [MVP Feature Scope](#4-mvp-feature-scope)
5. [30-Day Build Plan](#5-30-day-build-plan)
6. [Tech Stack](#6-tech-stack)
7. [Database Schema](#7-database-schema)
8. [AI Prompt Specification](#8-ai-prompt-specification)
9. [Onboarding Copy (All 8 Screens)](#9-onboarding-copy-all-8-screens)
10. [Paywall Strategy & Copy](#10-paywall-strategy--copy)
11. [Microcopy Library](#11-microcopy-library)
12. [App Store / Play Store Listing](#12-app-store--play-store-listing)
13. [Brand Identity System](#13-brand-identity-system)
14. [Marketing Plan — First 1,000 Users](#14-marketing-plan--first-1000-users)
15. [Metrics & Targets](#15-metrics--targets)
16. [Future Roadmap (Phase 2 & 3)](#16-future-roadmap-phase-2--3)
17. [Pre-Launch Checklist](#17-pre-launch-checklist)

---

## 1. Product Overview

**Name:** Cookable
**Tagline:** Cook anything. Waste nothing.
**Category:** Food & Drink (Lifestyle as iOS secondary)
**Platforms:** iOS + Android (React Native via Expo)
**Launch markets:** US + Canada, English only

**Core mechanic:**
1. User snaps a photo of their fridge or pantry
2. AI identifies ingredients and flags items about to expire
3. Generates 3 recipes personalized to skill level + cuisine preferences
4. Free users get 3 scans/week; Plus unlocks unlimited

**Problem solved:**
- "What's for dinner?" decision fatigue
- $1,300/year average household food waste
- Generic recipe apps that ignore what users actually have on hand

---

## 2. Differentiation Wedges

What makes Cookable different from existing AI recipe apps (incl. "Leftover Chef: AI Recipe Maker"):

| Wedge | How it works |
|---|---|
| **Expiring-soon priority** | AI flags wilting/browning/soft ingredients and prioritizes recipes that use them first |
| **Skill-level adaptive** | Onboarding asks Beginner / Home Cook / Confident — recipes match technique and ingredient count |
| **Cuisine-personalized** | Multi-select preferred cuisines at onboarding (Italian, Mexican, Thai, etc.) — recipes weight toward these |

**Brand positioning:** A great food brand that happens to use AI — not an AI brand that happens to do food.

---

## 3. Tier Structure & Pricing

### Free
- 3 scans per week (resets Sunday)
- Save up to 5 recipes
- Banner ads + interstitial after recipe generation
- Skill + cuisine personalization
- All cuisine types

### Plus — $4.99/mo or $29.99/yr (50% annual discount)
- Unlimited scans
- No ads
- Save unlimited recipes + collections (folders)
- Dietary filters (keto, vegan, gluten-free, halal, dairy-free, nut allergy)
- Pantry tracking across scans
- Auto-generated grocery lists for missing ingredients

**Free trial:** 7-day free trial on both monthly and annual. Card required up-front (RevenueCat handles).

### Pro — Phase 2 only, NOT at launch ($9.99/mo or $59.99/yr)
Reserved for after MVP validates. Will include:
- Everything in Plus
- Meal planning (3/5/7-day plans)
- **Find Best Deal** — scans local grocery flyers/sites to find cheapest store for a saved recipe's ingredients
- Price drop alerts on saved recipes
- Family sharing (up to 4 accounts)

---

## 4. MVP Feature Scope

### Must-have for v1 launch

**Free tier:**
- [ ] Apple + Google sign-in (no email/password)
- [ ] Camera capture or photo library upload
- [ ] AI ingredient detection (with editable list)
- [ ] 3 recipes per scan with cook time, difficulty, steps, ingredients used/missing
- [ ] Expiring-soon flag on detected ingredients
- [ ] Save up to 5 recipes
- [ ] 3 scans/week limit (rolling 7-day window)
- [ ] Banner + interstitial ads (AdMob, non-personalized)
- [ ] Skill + cuisine selection in onboarding

**Plus tier:**
- [ ] RevenueCat paywall integration
- [ ] 7-day free trial mechanics
- [ ] Unlimited scans
- [ ] Ad removal
- [ ] Unlimited saves + collections
- [ ] Dietary filters
- [ ] Pantry tracking
- [ ] Grocery list generation

### De-scoped from MVP (build later or never)

- ❌ Social features (sharing, comments, following)
- ❌ Video recipes
- ❌ Multi-language support
- ❌ Recipe ratings/reviews from other users
- ❌ Voice input
- ❌ Smart fridge integration
- ❌ Web app
- ❌ Email/password sign-in
- ❌ Postal code collection (until Find Best Deal in Phase 3)

---

## 5. 30-Day Build Plan

### Week 1 — Foundation (Days 1-7)
- Day 1-2: Expo init, Supabase project, AdMob + RevenueCat accounts setup
- Day 3-4: Auth flow (Apple + Google sign-in), navigation shell
- Day 5-7: Camera + photo upload screen, Supabase storage integration

### Week 2 — Core Magic (Days 8-14)
- Day 8-10: Anthropic API integration (Claude Sonnet 4.5 with vision); structured JSON prompt
- Day 11-12: Recipe display screen + editable ingredient list (critical safety net for AI errors)
- Day 13-14: Save/favorite recipes, basic profile screen

### Week 3 — Monetization (Days 15-21)
- Day 15-16: AdMob integration (banner + interstitial)
- Day 17-19: RevenueCat paywall, scan limit logic in Supabase
- Day 20-21: Premium feature gates: dietary filters, unlimited scans, ad removal

### Week 4 — Polish & Ship (Days 22-30)
- Day 22-23: Pantry tracking + grocery list generation
- Day 24-25: Onboarding flow (6 screens) + microcopy
- Day 26-27: App Store + Play Store assets (screenshots, copy, icon)
- Day 28-29: TestFlight beta with 10-20 users; bug fixes
- Day 30: Submit to both stores

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React Native (Expo) | One codebase, iOS + Android, fast iteration |
| Backend | Supabase | Auth + Postgres + storage in one, RLS-ready |
| AI / Vision | Claude Sonnet 4.5 (Anthropic API) | Single call: image in → ingredients + recipes JSON out |
| Payments | RevenueCat | Cross-platform subs, paywall A/B testing built-in |
| Ads | Google AdMob (non-personalized mode) | Avoids ATT prompt; standard SDK |
| Analytics | PostHog (free tier) | Funnel tracking, feature flags |
| Push notifications | Expo Notifications | Native to Expo, free |
| Hosting | Vercel (marketing site) + Supabase | $0 to start |

**Estimated infra cost month 1:** ~$0-25 (mostly API calls)
**Cost per scan:** ~$0.04-0.06 with Claude Sonnet 4.5 + vision

---

## 7. Database Schema

Postgres on Supabase. UUIDs as PKs. Soft-delete via `deleted_at`. RLS on every table.

### `users`
```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,

  -- Onboarding answers
  skill_level text check (skill_level in ('beginner', 'intermediate', 'confident')),
  preferred_cuisines text[] default '{}',
  dietary_filters text[] default '{}',
  postal_code text,  -- reserved for Find Best Deal phase

  -- Subscription cache (RevenueCat is authoritative)
  subscription_tier text default 'free' check (subscription_tier in ('free', 'plus', 'pro')),
  subscription_status text default 'inactive' check (subscription_status in ('inactive', 'trialing', 'active', 'cancelled', 'expired')),
  subscription_expires_at timestamptz,
  trial_ends_at timestamptz,

  -- Usage tracking
  scan_count_week integer default 0,
  scan_week_resets_at timestamptz,
  saved_recipe_count integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_active_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_users_subscription_tier on public.users(subscription_tier);
create index idx_users_last_active on public.users(last_active_at desc);
```

### `scans`
```sql
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  image_path text not null,
  image_thumbnail_path text,
  detected_ingredients jsonb,
  recipes jsonb,
  expiring_count integer default 0,
  api_latency_ms integer,
  api_cost_cents integer,
  model_used text default 'claude-sonnet-4-5',
  cache_key text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_scans_user_created on public.scans(user_id, created_at desc);
create index idx_scans_cache_key on public.scans(cache_key) where cache_key is not null;
```

### `saved_recipes`
```sql
create table public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  -- Snapshot at save time
  title text not null,
  cuisine text,
  cook_time_minutes integer,
  difficulty text,
  ingredients_used jsonb,
  ingredients_missing jsonb,
  steps jsonb,
  why_this_recipe text,

  user_notes text,
  user_rating integer check (user_rating between 1 and 5),
  cooked_count integer default 0,
  last_cooked_at timestamptz,
  collection_id uuid references public.collections(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_saved_recipes_user on public.saved_recipes(user_id, created_at desc) where deleted_at is null;
create index idx_saved_recipes_collection on public.saved_recipes(collection_id) where collection_id is not null;
```

### `collections` (Plus feature)
```sql
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  emoji text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_collections_user on public.collections(user_id, sort_order) where deleted_at is null;
```

### `pantry_items` (Plus feature)
```sql
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  ingredient_name text not null,
  quantity_estimate text,
  added_via text check (added_via in ('manual', 'scan')),
  scan_id uuid references public.scans(id) on delete set null,
  expires_at date,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create unique index idx_pantry_unique on public.pantry_items(user_id, ingredient_name) where deleted_at is null;
create index idx_pantry_user on public.pantry_items(user_id) where deleted_at is null;
create index idx_pantry_expires on public.pantry_items(user_id, expires_at) where expires_at is not null and deleted_at is null;
```

### `grocery_lists` and `grocery_items` (Plus feature)
```sql
create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text default 'Grocery List',
  created_at timestamptz default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists(id) on delete cascade,
  ingredient_name text not null,
  quantity text,
  source_recipe_id uuid references public.saved_recipes(id) on delete set null,
  is_checked boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index idx_grocery_items_list on public.grocery_items(list_id, sort_order);
```

### `subscription_events`
```sql
create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  revenuecat_user_id text,
  event_type text not null,
  product_id text,
  raw_payload jsonb not null,
  processed_at timestamptz default now()
);

create index idx_sub_events_user on public.subscription_events(user_id, processed_at desc);
```

### `feedback`
```sql
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  feedback_type text not null,
  context jsonb,
  message text,
  rating integer,
  app_version text,
  created_at timestamptz default now()
);

create index idx_feedback_type on public.feedback(feedback_type, created_at desc);
```

### Storage Buckets
```
scan-images/         (private, RLS)
  {user_id}/{scan_id}.jpg
  {user_id}/{scan_id}_thumb.jpg

avatars/             (public)
  {user_id}.jpg
```

**Lifecycle policy:** Auto-delete `scan-images/` files older than 90 days for free users, 180 days for Plus. Recipe data persists in DB; raw images don't need to.

### Sample RLS policy (apply pattern to all user-scoped tables)
```sql
alter table public.saved_recipes enable row level security;

create policy "Users read own saved_recipes" on public.saved_recipes for select using (auth.uid() = user_id);
create policy "Users insert own saved_recipes" on public.saved_recipes for insert with check (auth.uid() = user_id);
create policy "Users update own saved_recipes" on public.saved_recipes for update using (auth.uid() = user_id);
create policy "Users delete own saved_recipes" on public.saved_recipes for delete using (auth.uid() = user_id);
```

---

## 8. AI Prompt Specification

### System Prompt (Claude Sonnet 4.5 with vision)

```
You are Cookable's recipe engine. You analyze fridge/pantry photos and generate practical recipes that prioritize ingredients about to expire.

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

Generate exactly 3 recipes. At least 2 must use any ingredients flagged expiring_soon. Recipes should be genuinely different from each other (different cuisine, technique, or meal type — not three pasta dishes).
```

### User Message Template

```javascript
const userMessage = (userContext) => `User profile:
- Skill level: ${userContext.skill}
- Preferred cuisines: ${userContext.cuisines.join(", ")}
- Dietary filters: ${userContext.dietary?.join(", ") || "none"}
${userContext.additional_ingredients?.length ? `- User-added ingredients: ${userContext.additional_ingredients.join(", ")}` : ""}

Analyze the attached image and generate recipes.`;
```

### Engineering rules

- **Use JSON mode / structured output.** Parse defensively; retry once on JSON failure before showing error.
- **Resize images to max 1024px** on long edge before sending. Saves tokens, no quality loss for ingredient detection.
- **Cache aggressively.** Hash image + user profile. Same scan within 10 minutes returns cached recipes.
- **Low-confidence fallback.** If >50% of ingredients return `confidence: "low"`, prompt user: "We had trouble seeing your fridge clearly — add a few items manually."
- **Track per-scan cost** in `scans.api_cost_cents` for unit economics.

### Future cost optimization (if needed at scale)
- Two-step pipeline: Haiku for ingredient detection, Sonnet for recipe generation. Cuts cost ~40%.
- Don't optimize prematurely — ship single-call Sonnet 4.5 v1, measure, iterate.

---

## 9. Onboarding Copy (All 8 Screens)

### Design rules
- 6 screens before first scan; total time target <60 seconds (aim for 35)
- Auth happens AFTER first scan, not before
- One CTA per screen; tap-to-advance where natural
- Personalization (skill + cuisine) BEFORE the magic moment

### Screen 1 — Welcome

**Headline:** Cook anything. Waste nothing.
**Subhead:** Snap your fridge — we'll show you what you can cook tonight.
**CTA:** Get Started
**Secondary:** Already have account? Sign in

### Screen 2 — How It Works

**Headline:** Here's how it works
**Step 1 (📷):** Snap your fridge or pantry
**Step 2 (✨):** We'll spot every ingredient — even what's about to go bad
**Step 3 (🍳):** Get 3 recipes you can cook right now
**CTA:** Continue

### Screen 3 — Skill Level

**Headline:** How would you describe your cooking?
**Subhead:** We'll match recipes to your level.

Three tappable cards (auto-advance on tap):
- **🥄 Just starting** — Simple recipes, basic techniques
- **🍳 Home cook** — I cook regularly
- **🔪 Confident** — Bring on the techniques

### Screen 4 — Cuisine Preferences

**Headline:** What do you like to eat?
**Subhead:** Pick a few. We'll focus your recipes on these.

Multi-select grid:
- 🇮🇹 Italian, 🇲🇽 Mexican, 🇨🇳 Chinese, 🇮🇳 Indian, 🇹🇭 Thai, 🇯🇵 Japanese
- 🌿 Mediterranean, 🇰🇷 Korean, 🇫🇷 French, 🍔 American, 🥙 Middle Eastern, 🔥 BBQ/Grill
- ✨ Surprise me with anything

**CTA:** Continue [N selected]

### Screen 5 — Notification Permission

Visual: fake notification preview at top showing example
> 🔔 Cookable
> Sunday — what's in your fridge?

**Headline:** Want a weekly nudge?
**Subhead:** We'll send you a gentle reminder when it's time to plan meals. No spam, ever.
**CTA:** Yes, remind me
**Secondary:** Not now

(Tapping "Yes" triggers system permission dialog)

### Screen 6 — First Scan Prompt

Visual: 📷 with subtle pulse animation

**Headline:** Ready to cook?
**Subhead:** Open your fridge or pantry, and snap a photo. We'll handle the rest.
**Tip:** 💡 Get a clear shot — you can edit the ingredient list before recipes are generated.
**CTA:** Open Camera
**Secondary:** Use a saved photo

### Screen 7 — Post-Scan Auth Gate (after first scan completes)

Modal over the recipes screen (recipes visible behind):

**Headline:** Save these for later?
**Subhead:** Sign in to save your recipes and unlock unlimited use.
**CTA 1:** Continue with Apple
**CTA 2:** Continue with Google
**Secondary:** Maybe later

(Apple goes first on iOS; Google goes first on Android)

### Screen 8 — Soft Paywall Preview (post-scan, dismissible)

Slide-up sheet covering bottom 75%:

**Headline:** You're all set.
**Subhead:** You've got 3 free scans this week. Want unlimited?

**Benefits:**
- ✓ Unlimited scans
- ✓ No ads
- ✓ Save unlimited
- ✓ Dietary filters

**CTA:** Try Plus Free 7 Days
**Secondary:** Continue with free

---

## 10. Paywall Strategy & Copy

### Trigger points

| Trigger | When | Type |
|---|---|---|
| **Hard wall** | User hits 4th scan in a week | Blocks until subscribe or wait until reset |
| **Feature gate** | Tapping dietary filter, save recipe past 5, etc. | Blocks specific feature only |
| **Soft prompt** | After 2nd successful scan | Dismissible card |
| **Post-onboarding teaser** | Screen 8 above | Dismissible |

**Never paywall before the first scan completes.**

### Hard Paywall Screen Copy

**Headline:** Cook anything. Waste nothing.
**Subhead:** Unlock Cookable Plus

**Benefits (in order):**
- ✓ Unlimited fridge scans
- ✓ No ads, ever
- ✓ Save unlimited recipes
- ✓ Dietary filters (keto, vegan, gluten-free, halal, allergens)
- ✓ Pantry tracking
- ✓ Auto grocery lists

**Plan toggle (annual pre-selected):**
- 💰 Annual — Save 50%
  $29.99/year
  ($2.50/month — best value)
  [BEST DEAL badge]
- Monthly
  $4.99/month

**CTA:** Start 7-Day Free Trial
**Below CTA:** *Cancel anytime. No charge today.*
**Footer:** Restore Purchase • Terms • Privacy

**Close button:** Top-right, small but findable. Never hidden.

### Soft Prompts

**After 2nd scan (home card):**
> 🔥 You're on a roll
> Unlock unlimited scans + no ads with Plus.
> [See Plus →]   [Maybe later]

**Save-recipe button after 5 saves:**
> You've saved 5 recipes — your free limit.
> Plus members save unlimited recipes and organize them into collections.
> [Upgrade]   [Cancel]

**Dietary filter tap (free user):**
> Dietary filters are a Plus feature.
> Get keto, vegan, halal, gluten-free, and allergen filters.
> [Try Plus Free for 7 Days]   [Not now]

### Paywall A/B test plan

Launch with Variant A (waste angle), test against Variant D (value math) after 2 weeks of baseline data.

- **A:** "Cook anything. Waste nothing. / Save $1,300 a year on groceries you already own."
- **D:** "$4.99/mo. The average household wastes $25/week in food. / Cookable pays for itself the first day."

### Trial mechanics
- 7-day free trial, card required up-front
- Push notification 3 days before trial ends: "Your free week ends in 3 days. Manage your subscription anytime."
- RevenueCat handles all logic

---

## 11. Microcopy Library

| Context | Copy |
|---|---|
| Loading after photo capture | Looking at your fridge… |
| Loading recipes | Building 3 recipes for you… |
| AI low confidence | Hmm — let's double-check what's in there. Tap any wrong items to remove them, or add what's missing. |
| Empty ingredients state | No ingredients detected. Try a clearer photo or add ingredients manually. |
| Camera permission denied | We need camera access to scan your fridge. Tap to fix in Settings. |
| API failure | Something went wrong on our end. Tap to try again. |
| Offline | You're offline. Cookable needs internet to find recipes. |
| Hit free scan limit | You've used your 3 free scans this week. Resets Sunday — or unlock unlimited with Plus. |
| Successful save | Saved to your recipes ✓ |
| "I cooked this" tap | Hope it was good. 🔥 |

---

## 12. App Store / Play Store Listing

### iOS Title (30 chars)
> Cookable: AI Recipes from Fridge

### Android Title (50 chars)
> Cookable: AI Recipes from Your Fridge Photo

### iOS Subtitle (30 chars)
> Snap fridge. Cook tonight.

### Android Short Description (80 chars)
> Snap your fridge — get 3 recipes you can cook right now from what you have.

### iOS Keywords (100 chars, comma-separated, no spaces, no title repeats)
```
recipe,cooking,fridge,leftover,meal,dinner,pantry,grocery,scan,chef,kitchen,food,plan,waste
```

### Long Description (Android primary, iOS secondary — ~1500 chars)

```
Stop staring into your fridge wondering what to cook.

Cookable turns whatever's already in your fridge or pantry into 3 personalized recipes you can cook tonight — in seconds. Snap a photo, and our AI does the rest.

HOW IT WORKS
1. Open the camera and snap your fridge or pantry
2. Cookable identifies your ingredients (and flags what's about to go bad)
3. Get 3 recipes tailored to your skill level and favorite cuisines

WHY COOKABLE IS DIFFERENT
• Expiring-soon priority — recipes use ingredients before they go bad
• Skill-matched — beginner, home cook, or confident chef
• Cuisine-personalized — Italian, Mexican, Asian, Mediterranean, and more
• No fluff — clear steps, real cook times, ingredients you already have

SAVE MONEY. WASTE LESS.
The average household throws out over $1,300 of food a year. Cookable helps you actually use what you've already paid for.

UPGRADE TO COOKABLE PLUS
• Unlimited fridge scans
• Zero ads
• Save unlimited recipes and organize into collections
• Dietary filters: keto, vegan, gluten-free, halal, dairy-free, nut allergy
• Pantry tracking across scans
• Auto-generated grocery lists for missing ingredients

7-day free trial. Cancel anytime. Plans start at $4.99/month or $29.99/year.

PERFECT FOR
- Busy families tired of "what's for dinner?"
- Solo cooks who hate wasting groceries
- Meal preppers who want variety
- Anyone trying to eat at home more often

PRIVACY FIRST
Your photos are processed securely and deleted automatically. We never sell your data.

Have a feature request? Tap "Send Feedback" inside the app.
```

### Screenshots (in order)

| # | Caption | Visual |
|---|---|---|
| 1 | Snap your fridge. | Camera viewfinder with detected ingredient bounding boxes |
| 2 | Get 3 recipes in seconds. | Recipe results screen with 3 cards |
| 3 | Use ingredients before they go bad. | Ingredient list with "expiring soon" badges |
| 4 | Clear steps. Real cook times. | Full recipe view |
| 5 | Cooks Italian on Tuesdays. Thai on Thursdays. | Cuisine personalization grid |
| 6 | Plus unlocks unlimited scans, no ads, dietary filters. | Filter chips + pantry preview |
| 7 | (Post-launch: pull a real 5-star review) | Review card |

### Categories
- Primary: Food & Drink
- Secondary (iOS): Lifestyle

### App Tracking Transparency
- AdMob in non-personalized mode (no ATT prompt)
- Privacy Labels: Email, User ID, Photos, Usage Data, Diagnostics — all "Linked to user"
- No data used to track

### Required URLs
- Privacy Policy: hosted at `cookable.app/privacy`
- Terms of Service: hosted at `cookable.app/terms`
- Support: `support@cookable.app`

---

## 13. Brand Identity System

### Color Palette

**Primary — Forest Pine `#2D5F4E`**
- Pine Light `#4A8470`
- Pine Lighter `#C8DDD4`
- Pine Whisper `#EEF4F1`

**Accent — Saffron `#E89B3C`**
- Saffron Soft `#F4C58A`
- Saffron Whisper `#FCEFDC`

**Dark — Charcoal `#1A2421`**
- Charcoal Soft `#3A4844`

**Neutrals**
- Linen `#FAF7F2` (primary background)
- Stone `#F0EDE6` (cards)
- Stone Border `#E0DCD2`
- Mid Grey `#8A8A85`
- Light Grey `#C5C2BC`

**Semantic**
- Success `#4A8470`
- Warning `#E89B3C`
- Error `#C04638`
- Info `#5680A6`

**Dark Mode**
- Dark BG `#14191A`
- Dark Surface `#1F2724`
- Dark Border `#2E3531`
- Dark Text `#EEEDE8`
- Dark Mid Text `#9A9994`
- Dark Pine `#5BA086`
- Dark Saffron `#F0AD55`

### Color rules
1. Saffron + Forest Pine = the brand combo
2. Never use Saffron for body text
3. No gradients on text
4. No purple, no electric blue, no "AI gradient"
5. Let food photography carry warmth/saturation; UI stays calm

### Typography

**Display + Headlines: Fraunces** (Google Fonts, free)
**Body + UI: Inter** (Google Fonts, free)

### Type Scale

| Token | Size / Line | Weight | Font | Use |
|---|---|---|---|---|
| `display-xl` | 48 / 52 | 600 | Fraunces | Onboarding hero |
| `display-lg` | 36 / 40 | 600 | Fraunces | Paywall headline |
| `display-md` | 28 / 34 | 500 | Fraunces | Recipe titles, screen headers |
| `display-sm` | 22 / 28 | 500 | Fraunces | Card titles |
| `body-lg` | 17 / 26 | 400 | Inter | Primary body |
| `body-md` | 15 / 22 | 400 | Inter | Secondary body |
| `body-sm` | 13 / 18 | 400 | Inter | Captions |
| `label` | 12 / 16 | 600 | Inter (uppercase, +2% spacing) | Tags, badges |

**Typography rules:**
- Fraunces only at 22pt+
- Inter for all UI
- Max 3 weights per screen
- No letter-spacing on body
- Generous line height

### Logo Direction

**Wordmark:** `cookable` set in Fraunces 600 lowercase, slightly tightened letter-spacing, Forest Pine on light backgrounds. Optional: Saffron dot replacing the bowl of the second `o`, OR a small Saffron flame above the `k`.

**App Icon:** Solid Forest Pine background. **Recommended concept:** minimalist bowl icon with Saffron steam swirl rising from it. Avoid: fridge depictions, robot/AI faces, multiple competing colors, photographs of food.

**Designer deliverables:**
- Wordmark (horizontal)
- App icon (1024×1024 master + all platform exports)
- App icon dark variant (Pine background)
- Stacked lockup (icon + wordmark)
- Single-color versions (white on dark, dark on white)

**Budget:** $300-500 on Dribbble or 99designs

### Visual Language

- **Iconography:** Phosphor Icons (regular weight default, bold for primary actions). Do not mix icon libraries.
- **Photography:** Real food, natural light, warm and slightly desaturated. Slightly imperfect plating > magazine perfection.
- **Motion:** Subtle steam swirl/shimmer on key moments. No bouncy springs. ~250ms ease-out for entries.
- **Loading:** Skeleton loaders in Stone, not shimmer-blue.
- **Illustration:** Avoid stock illustration. Use photography or large Phosphor icons for empty states.

### Voice

| Cookable IS | Cookable IS NOT |
|---|---|
| Direct | Vague |
| Warm | Saccharine |
| Confident | Cocky |
| Practical | Aspirational |
| Slightly clever | Goofy |
| Encouraging | Cheerleader-y |

**Voice rules:**
- Contractions are fine
- Sentence case for everything
- No exclamation points except: "Saved! ✓" microcopy and recipe encouragement
- Banned words: "amazing," "delicious," "yummy," "scrumptious"
- Banned phrases: "powered by AI," "AI-powered"
- Use "you" liberally

---

## 14. Marketing Plan — First 1,000 Users

### The principle
Find your one channel, don't spread thin across all eight. Most successful indie apps get 60-80% of installs from a single channel.

### Funnel math
- 50K reach → 10K page visits → 2.5K installs → 1.5K activated → 400 retained → 200 trials → 120 paid (~$600 MRR)

### Channel portfolio (ranked by leverage)

**Tier 1 — high leverage, build early**

1. **TikTok organic** (the cheat code)
   - 1 video/day for first 30-60 days
   - Format: hook in 1.5s → fridge → snap → recipe → cook → plate → caption "the app is called Cookable"
   - Variations: broke college student, expiring food, judging strangers' fridges, follower-fridge
   - Realistic: one viral video drives 10K-50K installs

2. **Reddit** (slow but high-quality)
   - Subreddits: r/EatCheapAndHealthy, r/MealPrepSunday, r/Cooking, r/Frugal, r/StopWastingFood, r/cookingforbeginners, r/budgetfood, r/canada, r/ottawa
   - Be useful for 4 weeks before posting Show & Tell
   - Reddit-sourced users have ~3x retention of paid social

3. **Product Hunt launch**
   - Launch when polished, not just "done"
   - Tuesday or Wednesday 12:01 AM PST
   - 4-week pre-launch waitlist build
   - Find a hunter with 5K+ following

**Tier 2 — steady burn**

4. **LinkedIn personal content**
   - Build-in-public posts 2-3x/week
   - Tell the story, don't pitch
   - Compounds slowly

5. **Local press / community**
   - Pitch CBC Ottawa, Ottawa Citizen, Ottawa Magazine
   - BetaKit, Techvibes for Canadian tech press
   - Ottawa-based food bloggers
   - City of Ottawa food waste programs

6. **Micro-influencer seeding**
   - Target 5K-50K followers in cooking/frugal/parenting
   - Cold DM with free Plus, no obligation to post
   - 50 DMs → 1-2 organic posts

**Tier 3 — paid (after organic baseline)**

7. **Meta ads**
   - Wait until 4.5+ rating + organic funnel works
   - $10-30/day, single creative (TikTok-style video), parents 28-45
   - Target: <$5 install, <$25 paying customer

8. **Apple Search Ads**
   - $5-15/day on brand keyword + 2-3 competitor terms
   - Apple Search Ads Basic to start
   - Skip Google UAC for now (needs $50/day)

### Launch week plan

**Day 0 (Mon):** Submit to stores, email waitlist, LinkedIn + X "going live tomorrow"

**Day 1 (Tue, official launch):**
- Email waitlist with App Store links
- Product Hunt launch 12:01 AM PST
- Personal social posts
- Reddit post in r/StopWastingFood
- TikTok launch video
- DM 50 micro-influencers
- Pitch local press

**Days 2-7:** Daily TikTok, respond to every review within 24h, daily LinkedIn posts on launch learnings, iterate paywall + onboarding from data, pitch tech press

### Retention marketing

**Push notifications (2-3/week max):**
- Sunday morning: "Plan your week — what's in your fridge?"
- Wednesday: "Random fridge check — anything expiring?"
- Personal: "Your saved recipe '[X]' — cook it again tonight?"

**Email lifecycle:**
- Day 0: Welcome + first scan prompt
- Day 2: 5 ways power users use Cookable
- Day 5: What Plus unlocks (soft upgrade)
- Day 14: Your week in Cookable + rating ask

**Streaks:** "You've cooked from Cookable 3 weeks in a row 🔥"

### Budget

- Pre-launch: ~$400-1,800 cash (icon, screenshots, designer)
- Domain + landing page: $20
- Apple Dev: $99/yr
- Google Play: $25 one-time
- Optional paid ads (week 4+): $300-1,000 test budget
- **Time:** 15-20 hours/week on marketing for first 90 days

### The single most important thing
**Post on TikTok every day for 60 days.** That's the cheat code. The other 7 channels are useful but TikTok is asymmetric upside.

---

## 15. Metrics & Targets

### Onboarding & activation

| Metric | Target |
|---|---|
| Onboarding completion (Screen 1 → first scan) | >75% |
| First scan → recipes shown | >95% |
| Time from app open to first scan | <60 seconds |
| Notification opt-in rate | >60% |
| Auth conversion at Screen 7 | >50% |

### Paywall & monetization

| Metric | Month 1 target | Month 3 target |
|---|---|---|
| Paywall view rate (% of MAU) | >40% | >60% |
| Paywall → trial start | 8-12% | 12-18% |
| Trial → paid conversion | 50-65% | 60-75% |
| Annual vs monthly mix | 50/50 | 65/35 |
| Free → paid (overall MAU) | 1-2% | 3-5% |

### Retention

| Metric | Target |
|---|---|
| Day 1 retention | >40% |
| Day 7 retention | 25-30% |
| Day 30 retention | >15% |

### Reviews

| Metric | Target |
|---|---|
| Ratings at launch | 20+ |
| Average rating | 4.5+ |

### Diagnostic thresholds

- Onboarding completion <60% → fix Screens 1-2 copy/flow
- Notification opt-in <40% → fix Screen 5 framing
- Trial → paid <50% → product retention issue, NOT paywall issue
- Paywall → trial <8% → iterate paywall copy first, pricing last
- First scan → recipes <90% → engineering reliability issue

---

## 16. Future Roadmap (Phase 2 & 3)

**Phase 2 (Days 30-90, after MVP validates):**
- Pantry tracking (already in MVP if Plus)
- Auto grocery list (already in MVP if Plus)
- Meal planning (Pro tier teaser)
- Begin flyer ingestion pipeline build (background)
- Launch Pro tier teaser ("Coming soon: Find Best Deal")

**Phase 3 (Days 90-150):**
- Launch Find Best Deal (region TBD based on user data — likely Ontario or GTA first)
- Price drop alerts
- Family sharing
- Expand regions based on demand

**Find Best Deal architecture (when ready):**
- Central price index (NOT real-time scraping per user click)
- Aggregate flyers from Flipp API or scrape: Loblaws, Sobeys, Metro, Walmart, Costco, No Frills, FreshCo, Farm Boy, Food Basics
- Normalize SKUs to common ingredient taxonomy
- Refresh weekly (Thu-Wed flyer cycles in Canada)
- User flow: saved recipe → "Find Best Deal" → postal code → cheapest total at nearby store
- Affiliate revenue from grocery click-throughs

**Always-deferred (probably never):**
- Voice input
- Smart fridge integration
- Web app
- Social features
- Multi-language (until 6-month mark with data)

---

## 17. Pre-Launch Checklist

### Accounts & infrastructure
- [ ] Apple Developer account ($99/yr)
- [ ] Google Play Developer account ($25 one-time)
- [ ] Anthropic API account + key
- [ ] Supabase project
- [ ] AdMob account
- [ ] RevenueCat account
- [ ] PostHog free tier
- [ ] Resend or Beehiiv for email
- [ ] Domain (cookable.app or similar)

### Legal
- [ ] Privacy policy hosted
- [ ] Terms of Service hosted
- [ ] Support email (support@cookable.app)
- [ ] Privacy Nutrition Labels filled (iOS)
- [ ] Data Safety section filled (Android)

### Brand assets
- [ ] Logo (wordmark + icon + variants)
- [ ] App icon (1024×1024 + all sizes)
- [ ] Splash screen artwork
- [ ] Color tokens file in code
- [ ] Fraunces + Inter integrated
- [ ] App Store screenshots (10) — all required sizes
- [ ] Press kit Notion page

### App readiness
- [ ] All 8 onboarding screens built and copy-locked
- [ ] Paywall built and tested
- [ ] AdMob integrated and tested
- [ ] RevenueCat integrated and tested
- [ ] Sign in with Apple working
- [ ] Sign in with Google working
- [ ] Camera + photo library working on iOS + Android
- [ ] Anthropic API integration with retry + error handling
- [ ] Editable ingredient list before recipe generation
- [ ] Saved recipes flow
- [ ] Free scan limit (3/week, rolling) enforced
- [ ] Push notification setup + test
- [ ] Dark mode working

### Pre-launch testing
- [ ] TestFlight beta with 10-20 users
- [ ] Google Play Internal Testing with 10-20 users
- [ ] All critical bugs fixed
- [ ] At least 5 close friends installed via beta and confirmed core flow works

### Distribution prep
- [ ] Landing page live (cookable.app)
- [ ] Email waitlist collecting (target: 500-1,000 by launch)
- [ ] Social handles secured (@cookableapp on TikTok, IG, X, YouTube, LinkedIn)
- [ ] 5+ TikTok videos drafted/scheduled for launch week
- [ ] Product Hunt hunter lined up
- [ ] List of 50 micro-influencers ready to DM
- [ ] List of local press contacts ready to pitch
- [ ] 3-5 friends ready to comment on Product Hunt in first hour

### Submit
- [ ] App Store Connect listing complete
- [ ] Play Console listing complete
- [ ] Submit Monday for Tuesday launch (allow 24-48h iOS review)

---

## Appendix: Quick reference

**Brand colors:** Forest Pine `#2D5F4E` + Saffron `#E89B3C` on Linen `#FAF7F2`
**Fonts:** Fraunces (display) + Inter (UI)
**Tagline:** Cook anything. Waste nothing.
**Pricing:** Free / Plus $4.99/mo or $29.99/yr / Pro (Phase 2+)
**Free trial:** 7 days, card required
**Free tier limits:** 3 scans/week, 5 saved recipes
**Cost per scan:** ~$0.04-0.06 (Claude Sonnet 4.5)
**MRR target month 3:** ~$600 (120 paying users)
