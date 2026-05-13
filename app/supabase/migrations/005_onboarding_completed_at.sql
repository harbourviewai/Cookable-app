alter table public.users
  add column if not exists onboarding_completed_at timestamptz;

update public.users
set onboarding_completed_at = now()
where onboarding_completed_at is null;
