-- Public discovery, profile interests and contribution-based discovery ranking
alter table public.trips add column if not exists is_public boolean not null default false;
create index if not exists trips_public_idx on public.trips(is_public, created_at desc);

create table if not exists public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique(user_id, name, city, country)
);
create index if not exists profile_interests_user_idx on public.profile_interests(user_id);
create index if not exists profile_interests_destination_idx on public.profile_interests(country, city);

alter table public.profile_interests enable row level security;
drop policy if exists profile_interests_select on public.profile_interests;
create policy profile_interests_select on public.profile_interests for select to authenticated using (true);
drop policy if exists profile_interests_insert on public.profile_interests;
create policy profile_interests_insert on public.profile_interests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profile_interests_delete on public.profile_interests;
create policy profile_interests_delete on public.profile_interests for delete to authenticated using (user_id = auth.uid());

-- Public profiles contain no email/credential fields, so they can be indexed by search engines.
drop policy if exists profiles_public_anon_select on public.profiles;
create policy profiles_public_anon_select on public.profiles
for select to anon using (true);

drop policy if exists trips_public_anon_select on public.trips;
create policy trips_public_anon_select on public.trips
for select to anon using (is_public = true);

drop policy if exists trip_locations_public_anon_select on public.trip_locations;
create policy trip_locations_public_anon_select on public.trip_locations
for select to anon using (
  exists (select 1 from public.trips t where t.id = trip_locations.trip_id and t.is_public = true)
);

-- Discovery only needs aggregate public destinations; interests themselves remain authenticated.
create or replace function public.profile_contribution_score(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int * 10 from public.feed_posts p where p.user_id = p_user_id and p.visibility = 'public')
    + (select count(*)::int * 3 from public.feed_post_media m join public.feed_posts p on p.id = m.post_id where p.user_id = p_user_id and p.visibility = 'public')
    + (select count(*)::int * 5 from public.trips t where t.user_id = p_user_id and t.is_public = true)
    + (select count(*)::int * 1 from public.feed_likes l join public.feed_posts p on p.id = l.post_id where p.user_id = p_user_id)
    + (select count(*)::int * 2 from public.user_follows f where f.following_id = p_user_id);
$$;

notify pgrst, 'reload schema';
