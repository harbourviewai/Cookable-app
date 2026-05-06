-- Cookable — storage RLS
-- Prerequisite: create the buckets in Supabase Dashboard → Storage first.
--   - scan-images (private)
--   - avatars     (public)
-- Then run this file in the SQL editor.
--
-- Path patterns:
--   scan-images/{user_id}/{scan_id}.jpg
--   scan-images/{user_id}/{scan_id}_thumb.jpg
--   avatars/{user_id}.jpg
--
-- Lifecycle (set up later in dashboard or via cron):
--   scan-images files older than 90 days for free users, 180 days for Plus.

-- ─────────────────────────────────────────────
-- scan-images (private) — users can only touch their own folder
-- ─────────────────────────────────────────────
create policy "Users upload own scan images" on storage.objects for insert
  with check (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own scan images" on storage.objects for select
  using (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own scan images" on storage.objects for update
  using (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own scan images" on storage.objects for delete
  using (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────
-- avatars (public) — readable by anyone, but only the owner can write
-- The path is `{user_id}.jpg` so we match on the file name's first segment.
-- ─────────────────────────────────────────────
create policy "Anyone can read avatars" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '.', 1)
  );

create policy "Users update own avatar" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '.', 1)
  );

create policy "Users delete own avatar" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '.', 1)
  );
