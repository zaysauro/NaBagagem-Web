drop policy if exists profile_interests_public_anon_select on public.profile_interests;
create policy profile_interests_public_anon_select on public.profile_interests
for select to anon using (true);

drop policy if exists user_follows_public_anon_select on public.user_follows;
create policy user_follows_public_anon_select on public.user_follows
for select to anon using (true);

notify pgrst, 'reload schema';
