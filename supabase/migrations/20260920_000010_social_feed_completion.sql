-- Social feed completion: follows/blocks-aware visibility and moderation defaults.

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id,following_id),
  check (follower_id<>following_id)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  check (blocker_id<>blocked_id)
);

alter table public.user_follows enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "follows_select_public" on public.user_follows;
create policy "follows_select_public" on public.user_follows
for select to authenticated using (true);

drop policy if exists "follows_owner_insert" on public.user_follows;
create policy "follows_owner_insert" on public.user_follows
for insert to authenticated with check (follower_id=auth.uid());

drop policy if exists "follows_owner_delete" on public.user_follows;
create policy "follows_owner_delete" on public.user_follows
for delete to authenticated using (follower_id=auth.uid());

drop policy if exists "blocks_owner_select" on public.user_blocks;
create policy "blocks_owner_select" on public.user_blocks
for select to authenticated using (blocker_id=auth.uid() or blocked_id=auth.uid());

drop policy if exists "blocks_owner_insert" on public.user_blocks;
create policy "blocks_owner_insert" on public.user_blocks
for insert to authenticated with check (blocker_id=auth.uid());

drop policy if exists "blocks_owner_delete" on public.user_blocks;
create policy "blocks_owner_delete" on public.user_blocks
for delete to authenticated using (blocker_id=auth.uid());

create index if not exists user_follows_following_idx on public.user_follows(following_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

-- Comments now require explicit approval. Existing comments keep their current state.
alter table public.feed_comments alter column approved set default false;

drop policy if exists "feed_posts_select_public" on public.feed_posts;
create policy "feed_posts_select_public" on public.feed_posts
for select to authenticated using (
  user_id=auth.uid()
  or (
    not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id=auth.uid() and b.blocked_id=feed_posts.user_id)
         or (b.blocker_id=feed_posts.user_id and b.blocked_id=auth.uid())
    )
    and (
      visibility='public'
      or (
        visibility='followers'
        and exists (
          select 1 from public.user_follows f
          where f.follower_id=auth.uid()
            and f.following_id=feed_posts.user_id
        )
      )
    )
  )
);

drop policy if exists "feed_likes_select" on public.feed_likes;
create policy "feed_likes_select" on public.feed_likes
for select to authenticated using (
  exists (
    select 1 from public.feed_posts p
    where p.id=post_id
      and (
        p.user_id=auth.uid()
        or (
          not exists (
            select 1 from public.user_blocks b
            where (b.blocker_id=auth.uid() and b.blocked_id=p.user_id)
               or (b.blocker_id=p.user_id and b.blocked_id=auth.uid())
          )
          and (
            p.visibility='public'
            or (
              p.visibility='followers'
              and exists (
                select 1 from public.user_follows f
                where f.follower_id=auth.uid()
                  and f.following_id=p.user_id
              )
            )
          )
        )
      )
  )
);

drop policy if exists "feed_likes_owner_insert" on public.feed_likes;
create policy "feed_likes_owner_insert" on public.feed_likes
for insert to authenticated with check (
  user_id=auth.uid()
  and exists (select 1 from public.feed_posts p where p.id=post_id)
);

drop policy if exists "feed_comments_select" on public.feed_comments;
create policy "feed_comments_select" on public.feed_comments
for select to authenticated using (
  exists (
    select 1 from public.feed_posts p
    where p.id=post_id
      and (
        p.user_id=auth.uid()
        or (
          approved=true
          and not exists (
            select 1 from public.user_blocks b
            where (b.blocker_id=auth.uid() and b.blocked_id=p.user_id)
               or (b.blocker_id=p.user_id and b.blocked_id=auth.uid())
          )
          and (
            p.visibility='public'
            or (
              p.visibility='followers'
              and exists (
                select 1 from public.user_follows f
                where f.follower_id=auth.uid()
                  and f.following_id=p.user_id
              )
            )
          )
        )
        or user_id=auth.uid()
      )
  )
);

drop policy if exists "feed_comments_insert" on public.feed_comments;
create policy "feed_comments_insert" on public.feed_comments
for insert to authenticated with check (
  user_id=auth.uid()
  and exists (select 1 from public.feed_posts p where p.id=post_id)
);

alter publication supabase_realtime add table public.user_follows;
alter publication supabase_realtime add table public.user_blocks;
