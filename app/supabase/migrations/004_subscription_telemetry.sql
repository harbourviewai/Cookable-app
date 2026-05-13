-- 004_subscription_telemetry.sql
--
-- Adds the counters and dismissal stamp Week 3 monetization needs:
--   * scan_count_lifetime — increments alongside scan_count_week. Used to gate
--     the soft prompt (shown on scan #2) and the interstitial cadence (every
--     2nd lifetime scan). Survives the 7-day weekly window reset.
--   * soft_prompt_dismissed_at — set when the user taps "Maybe later" on the
--     2nd-scan upgrade card. Once stamped, the card never returns.
--   * interstitials_shown_count — bumped each time the interstitial actually
--     renders. Useful for capping or for retro analytics.
--
-- Backfills scan_count_lifetime from existing scans rows (cheap pre-launch).

alter table public.users
  add column if not exists scan_count_lifetime integer not null default 0,
  add column if not exists soft_prompt_dismissed_at timestamptz,
  add column if not exists interstitials_shown_count integer not null default 0;

update public.users u
   set scan_count_lifetime = sub.cnt
  from (
    select user_id, count(*)::int as cnt
      from public.scans
     group by user_id
  ) as sub
 where u.id = sub.user_id
   and u.scan_count_lifetime = 0;
