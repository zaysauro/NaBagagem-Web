create table if not exists public.travel_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bio text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique(user_id,badge_key)
);

alter table public.travel_stats enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "travel_stats_owner" on public.travel_stats;
create policy "travel_stats_owner" on public.travel_stats for all using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "user_badges_owner" on public.user_badges;
create policy "user_badges_owner" on public.user_badges for all using (user_id=auth.uid()) with check (user_id=auth.uid());

create index if not exists trip_locations_user_country_idx
on public.trip_locations(trip_id,country);

create index if not exists trip_locations_user_city_idx
on public.trip_locations(trip_id,city);
