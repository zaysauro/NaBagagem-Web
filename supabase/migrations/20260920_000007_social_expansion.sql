create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_follows_following_idx on public.user_follows(following_id);
create index if not exists feed_post_media_post_idx on public.feed_post_media(post_id, created_at);

alter table public.user_follows enable row level security;
alter table public.user_blocks enable row level security;
alter table public.feed_post_media enable row level security;

drop policy if exists "follows_select_related" on public.user_follows;
create policy "follows_select_related" on public.user_follows
for select to authenticated using (follower_id=auth.uid() or following_id=auth.uid());

drop policy if exists "follows_insert_owner" on public.user_follows;
create policy "follows_insert_owner" on public.user_follows
for insert to authenticated with check (follower_id=auth.uid());

drop policy if exists "follows_delete_owner" on public.user_follows;
create policy "follows_delete_owner" on public.user_follows
for delete to authenticated using (follower_id=auth.uid());

drop policy if exists "blocks_select_owner" on public.user_blocks;
create policy "blocks_select_owner" on public.user_blocks
for select to authenticated using (blocker_id=auth.uid());

drop policy if exists "blocks_insert_owner" on public.user_blocks;
create policy "blocks_insert_owner" on public.user_blocks
for insert to authenticated with check (blocker_id=auth.uid());

drop policy if exists "blocks_delete_owner" on public.user_blocks;
create policy "blocks_delete_owner" on public.user_blocks
for delete to authenticated using (blocker_id=auth.uid());

drop policy if exists "media_select_visible_post" on public.feed_post_media;
create policy "media_select_visible_post" on public.feed_post_media
for select to authenticated using (
  exists (
    select 1 from public.feed_posts p
    where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid())
  )
);

drop policy if exists "media_insert_owner" on public.feed_post_media;
create policy "media_insert_owner" on public.feed_post_media
for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "media_delete_owner" on public.feed_post_media;
create policy "media_delete_owner" on public.feed_post_media
for delete to authenticated using (user_id=auth.uid());

-- Public profile fields are visible only when the user explicitly enables public stats/profile.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.travel_stats s
    where s.user_id=profiles.id and s.is_public=true
  )
);

-- Storage bucket for feed images.
insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do update set public=true;

drop policy if exists "feed_media_public_read" on storage.objects;
create policy "feed_media_public_read" on storage.objects
for select using (bucket_id='feed-media');

drop policy if exists "feed_media_auth_insert" on storage.objects;
create policy "feed_media_auth_insert" on storage.objects
for insert to authenticated
with check (bucket_id='feed-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "feed_media_owner_delete" on storage.objects;
create policy "feed_media_owner_delete" on storage.objects
for delete to authenticated
using (bucket_id='feed-media' and owner_id=auth.uid()::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='feed_posts'
  ) then
    alter publication supabase_realtime add table public.feed_posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='feed_likes'
  ) then
    alter publication supabase_realtime add table public.feed_likes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='feed_comments'
  ) then
    alter publication supabase_realtime add table public.feed_comments;
  end if;
end $$;
