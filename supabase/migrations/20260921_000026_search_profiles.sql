-- Allow authenticated users to discover registered traveler profiles.
-- Search must not depend on the social feed tables being installed.

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create index if not exists profiles_username_search_idx
on public.profiles using gin (to_tsvector('simple', coalesce(username,'')));

create index if not exists profiles_display_name_search_idx
on public.profiles using gin (to_tsvector('simple', coalesce(display_name,'')));
