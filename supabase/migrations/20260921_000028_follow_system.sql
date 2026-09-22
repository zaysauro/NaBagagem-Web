-- Follow / follow-back system.
-- Safe repair for databases where the social migrations were not applied in order.

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on public.user_follows(following_id);
create index if not exists user_follows_follower_idx on public.user_follows(follower_id);

alter table public.user_follows enable row level security;

drop policy if exists "follows_select_public" on public.user_follows;
create policy "follows_select_public" on public.user_follows
for select to authenticated using (true);

drop policy if exists "follows_insert_owner" on public.user_follows;
create policy "follows_insert_owner" on public.user_follows
for insert to authenticated
with check (follower_id = auth.uid() and follower_id <> following_id);

drop policy if exists "follows_delete_owner" on public.user_follows;
create policy "follows_delete_owner" on public.user_follows
for delete to authenticated
using (follower_id = auth.uid());
