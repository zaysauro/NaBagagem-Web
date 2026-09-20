drop policy if exists "follows_select_public" on public.user_follows;
create policy "follows_select_public" on public.user_follows
for select to authenticated using (true);

create index if not exists feed_comments_post_created_idx on public.feed_comments(post_id, created_at);

drop policy if exists "comments_owner_moderate" on public.feed_comments;
create policy "comments_owner_moderate" on public.feed_comments
for update to authenticated using (
  exists (select 1 from public.feed_posts p where p.id=feed_comments.post_id and p.user_id=auth.uid())
) with check (
  exists (select 1 from public.feed_posts p where p.id=feed_comments.post_id and p.user_id=auth.uid())
);

drop policy if exists "comments_owner_delete" on public.feed_comments;
create policy "comments_owner_delete" on public.feed_comments
for delete to authenticated using (
  user_id=auth.uid()
  or exists (select 1 from public.feed_posts p where p.id=feed_comments.post_id and p.user_id=auth.uid())
);