create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create index if not exists feed_bookmarks_user_idx
  on public.feed_bookmarks(user_id,created_at desc);

create index if not exists feed_bookmarks_post_idx
  on public.feed_bookmarks(post_id);

alter table public.feed_bookmarks enable row level security;

drop policy if exists "feed_bookmarks_select_own" on public.feed_bookmarks;
create policy "feed_bookmarks_select_own"
on public.feed_bookmarks for select
to authenticated
using (user_id=auth.uid());

drop policy if exists "feed_bookmarks_insert_own" on public.feed_bookmarks;
create policy "feed_bookmarks_insert_own"
on public.feed_bookmarks for insert
to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_bookmarks_delete_own" on public.feed_bookmarks;
create policy "feed_bookmarks_delete_own"
on public.feed_bookmarks for delete
to authenticated
using (user_id=auth.uid());

alter publication supabase_realtime add table public.feed_bookmarks;
