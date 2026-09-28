-- NaBagagem: repair feed photo publishing end-to-end.
-- Safe to run repeatedly in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Feed tables required by the photo flow.
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  title text not null,
  body text,
  visibility text not null default 'public'
    check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text,
  media_type text not null default 'image',
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

alter table public.feed_post_media
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists public_url text,
  add column if not exists media_type text not null default 'image',
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists width integer,
  add column if not exists height integer;

create index if not exists feed_post_media_post_idx
  on public.feed_post_media(post_id);

create index if not exists feed_post_media_user_idx
  on public.feed_post_media(user_id, created_at desc);

alter table public.feed_posts enable row level security;
alter table public.feed_post_media enable row level security;

-- Replace conflicting/duplicated feed policies with explicit owner rules.
drop policy if exists feed_posts_insert on public.feed_posts;
create policy feed_posts_insert
on public.feed_posts
for insert
to authenticated
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists feed_posts_select on public.feed_posts;
create policy feed_posts_select
on public.feed_posts
for select
to authenticated
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1
      from public.user_follows f
      where f.follower_id = auth.uid()
        and f.following_id = feed_posts.user_id
    )
  )
);

drop policy if exists feed_posts_update on public.feed_posts;
create policy feed_posts_update
on public.feed_posts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists feed_posts_delete on public.feed_posts;
create policy feed_posts_delete
on public.feed_posts
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists feed_media_select on public.feed_post_media;
create policy feed_media_select
on public.feed_post_media
for select
to authenticated
using (
  exists (
    select 1
    from public.feed_posts p
    where p.id = feed_post_media.post_id
      and (
        p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and exists (
            select 1
            from public.user_follows f
            where f.follower_id = auth.uid()
              and f.following_id = p.user_id
          )
        )
      )
  )
);

drop policy if exists feed_media_insert on public.feed_post_media;
create policy feed_media_insert
on public.feed_post_media
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and exists (
    select 1
    from public.feed_posts p
    where p.id = feed_post_media.post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists feed_media_delete on public.feed_post_media;
create policy feed_media_delete
on public.feed_post_media
for delete
to authenticated
using (user_id = auth.uid());

-- Public bucket: images are displayed directly in the public feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-media',
  'feed-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- Each user's files live under: user_id/post_id/random.ext
drop policy if exists feed_media_storage_insert on storage.objects;
create policy feed_media_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists feed_media_storage_update on storage.objects;
create policy feed_media_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists feed_media_storage_delete on storage.objects;
create policy feed_media_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'feed-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
