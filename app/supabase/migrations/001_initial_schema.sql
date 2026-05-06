-- Cookable — initial schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Enable moddatetime so we can auto-bump updated_at columns on UPDATE.
create extension if not exists moddatetime;

-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,

  -- Onboarding answers
  skill_level text check (skill_level in ('beginner', 'intermediate', 'confident')),
  preferred_cuisines text[] default '{}',
  dietary_filters text[] default '{}',
  postal_code text,

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

create trigger users_set_updated_at
  before update on public.users
  for each row execute procedure moddatetime(updated_at);

alter table public.users enable row level security;
create policy "Users read own profile" on public.users for select using (auth.uid() = id);
create policy "Users update own profile" on public.users for update using (auth.uid() = id);
create policy "Users insert own profile" on public.users for insert with check (auth.uid() = id);

-- Auto-create users row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- scans
-- ─────────────────────────────────────────────
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

alter table public.scans enable row level security;
create policy "Users read own scans" on public.scans for select using (auth.uid() = user_id);
create policy "Users insert own scans" on public.scans for insert with check (auth.uid() = user_id);
create policy "Users update own scans" on public.scans for update using (auth.uid() = user_id);
create policy "Users delete own scans" on public.scans for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- collections (Plus feature)
-- ─────────────────────────────────────────────
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

alter table public.collections enable row level security;
create policy "Users read own collections" on public.collections for select using (auth.uid() = user_id);
create policy "Users insert own collections" on public.collections for insert with check (auth.uid() = user_id);
create policy "Users update own collections" on public.collections for update using (auth.uid() = user_id);
create policy "Users delete own collections" on public.collections for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- saved_recipes
-- ─────────────────────────────────────────────
create table public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,

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

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index idx_saved_recipes_user on public.saved_recipes(user_id, created_at desc) where deleted_at is null;
create index idx_saved_recipes_collection on public.saved_recipes(collection_id) where collection_id is not null;

create trigger saved_recipes_set_updated_at
  before update on public.saved_recipes
  for each row execute procedure moddatetime(updated_at);

alter table public.saved_recipes enable row level security;
create policy "Users read own saved_recipes" on public.saved_recipes for select using (auth.uid() = user_id);
create policy "Users insert own saved_recipes" on public.saved_recipes for insert with check (auth.uid() = user_id);
create policy "Users update own saved_recipes" on public.saved_recipes for update using (auth.uid() = user_id);
create policy "Users delete own saved_recipes" on public.saved_recipes for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- pantry_items (Plus feature)
-- ─────────────────────────────────────────────
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

alter table public.pantry_items enable row level security;
create policy "Users read own pantry" on public.pantry_items for select using (auth.uid() = user_id);
create policy "Users insert own pantry" on public.pantry_items for insert with check (auth.uid() = user_id);
create policy "Users update own pantry" on public.pantry_items for update using (auth.uid() = user_id);
create policy "Users delete own pantry" on public.pantry_items for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- grocery_lists + grocery_items (Plus feature)
-- ─────────────────────────────────────────────
create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text default 'Grocery list',
  created_at timestamptz default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

alter table public.grocery_lists enable row level security;
create policy "Users read own grocery_lists" on public.grocery_lists for select using (auth.uid() = user_id);
create policy "Users insert own grocery_lists" on public.grocery_lists for insert with check (auth.uid() = user_id);
create policy "Users update own grocery_lists" on public.grocery_lists for update using (auth.uid() = user_id);
create policy "Users delete own grocery_lists" on public.grocery_lists for delete using (auth.uid() = user_id);

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

alter table public.grocery_items enable row level security;
create policy "Users manage own grocery_items" on public.grocery_items for all
  using (exists (
    select 1 from public.grocery_lists gl
    where gl.id = list_id and gl.user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────
-- subscription_events
-- ─────────────────────────────────────────────
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

-- subscription_events are written by server-side webhook only — no user RLS needed

-- ─────────────────────────────────────────────
-- feedback
-- ─────────────────────────────────────────────
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

alter table public.feedback enable row level security;
create policy "Users insert own feedback" on public.feedback for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- storage buckets
-- ─────────────────────────────────────────────
-- Bucket creation and RLS now lives in 002_storage.sql.
-- Create the buckets in Supabase Dashboard → Storage → New bucket first,
-- then run 002_storage.sql in the SQL editor to apply RLS policies.
