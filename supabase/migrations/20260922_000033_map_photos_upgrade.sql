-- NaBagagem V2: map ordering, photo limits and Storage hardening
alter table public.trip_events add column if not exists order_index integer not null default 0;
create index if not exists trip_events_day_order_idx on public.trip_events(trip_id, day_index, order_index, event_date, start_time);

-- Feed media metadata used for safe, compact uploads.
alter table public.feed_post_media add column if not exists width integer;
alter table public.feed_post_media add column if not exists height integer;
alter table public.feed_post_media add column if not exists mime_type text;
alter table public.feed_post_media add column if not exists size_bytes bigint;

create index if not exists feed_post_media_post_id_idx on public.feed_post_media(post_id);

-- Keep the public media bucket available to the feed while limiting object ownership
-- through the existing Storage RLS policies.
insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do update set public = true;

drop policy if exists "feed_media_insert_own" on storage.objects;
create policy "feed_media_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "feed_media_update_own" on storage.objects;
create policy "feed_media_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feed_media_delete_own" on storage.objects;
create policy "feed_media_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feed_media_read_public" on storage.objects;
create policy "feed_media_read_public"
on storage.objects for select to public
using (bucket_id = 'feed-media');
