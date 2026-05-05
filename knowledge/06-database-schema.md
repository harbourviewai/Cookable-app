# Database Schema

Postgres on Supabase. UUIDs as PKs. Soft-delete via `deleted_at`. RLS on every table.

## `users`

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

## `scans`

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

## `saved_recipes`

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

## `collections` (Plus feature)

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

## `pantry_items` (Plus feature)

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

## `grocery_lists` and `grocery_items` (Plus feature)

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

## `subscription_events`

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

## `feedback`

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

## Storage Buckets

```
scan-images/         (private, RLS)
  {user_id}/{scan_id}.jpg
  {user_id}/{scan_id}_thumb.jpg

avatars/             (public)
  {user_id}.jpg
```

**Lifecycle policy:** Auto-delete `scan-images/` files older than 90 days for free users, 180 days for Plus. Recipe data persists in DB; raw images don't need to.

## Sample RLS policy

Apply this pattern to all user-scoped tables:

```sql
alter table public.saved_recipes enable row level security;

create policy "Users read own saved_recipes" on public.saved_recipes for select using (auth.uid() = user_id);
create policy "Users insert own saved_recipes" on public.saved_recipes for insert with check (auth.uid() = user_id);
create policy "Users update own saved_recipes" on public.saved_recipes for update using (auth.uid() = user_id);
create policy "Users delete own saved_recipes" on public.saved_recipes for delete using (auth.uid() = user_id);
```
