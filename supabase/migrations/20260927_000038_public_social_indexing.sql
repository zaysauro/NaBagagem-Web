-- Public pages and SEO can read only public social content.
drop policy if exists feed_posts_public_anon_select on public.feed_posts;
create policy feed_posts_public_anon_select on public.feed_posts
for select to anon using (visibility = 'public');

drop policy if exists feed_post_media_public_anon_select on public.feed_post_media;
create policy feed_post_media_public_anon_select on public.feed_post_media
for select to anon using (
  exists (select 1 from public.feed_posts p where p.id = feed_post_media.post_id and p.visibility = 'public')
);

drop policy if exists feed_likes_public_anon_select on public.feed_likes;
create policy feed_likes_public_anon_select on public.feed_likes
for select to anon using (
  exists (select 1 from public.feed_posts p where p.id = feed_likes.post_id and p.visibility = 'public')
);

notify pgrst, 'reload schema';
