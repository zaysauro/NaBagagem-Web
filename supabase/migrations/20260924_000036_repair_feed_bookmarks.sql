-- NaBagagem V2: targeted repair for feed bookmarks
-- Safe to run repeatedly in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_bookmarks_user_idx
  on public.feed_bookmarks(user_id, created_at desc);

create index if not exists feed_bookmarks_post_idx
  on public.feed_bookmarks(post_id, created_at desc);

alter table public.feed_bookmarks enable row level security;

drop policy if exists feed_bookmarks_select on public.feed_bookmarks;
create policy feed_bookmarks_select
  on public.feed_bookmarks
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists feed_bookmarks_insert on public.feed_bookmarks;
create policy feed_bookmarks_insert
  on public.feed_bookmarks
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.feed_posts p
      where p.id = post_id
        and public.can_view_feed_post(p.id, auth.uid())
    )
  );

drop policy if exists feed_bookmarks_delete on public.feed_bookmarks;
create policy feed_bookmarks_delete
  on public.feed_bookmarks
  for delete
  to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
