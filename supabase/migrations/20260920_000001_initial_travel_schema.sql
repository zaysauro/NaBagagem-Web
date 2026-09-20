create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_valid check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_start_date_idx on public.trips(start_date);

create table if not exists public.trip_locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  visited_at date,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trip_locations_trip_id_idx on public.trip_locations(trip_id);

create table if not exists public.trip_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  location_id uuid references public.trip_locations(id) on delete set null,
  title text not null,
  description text,
  event_date date,
  start_time time,
  end_time time,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists trip_events_trip_id_idx on public.trip_events(trip_id);
create index if not exists trip_events_event_date_idx on public.trip_events(event_date);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_locations enable row level security;
alter table public.trip_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own"
on public.trips for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own"
on public.trips for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own"
on public.trips for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own"
on public.trips for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "trip_locations_select_own" on public.trip_locations;
create policy "trip_locations_select_own"
on public.trip_locations for select
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_locations.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_locations_insert_own" on public.trip_locations;
create policy "trip_locations_insert_own"
on public.trip_locations for insert
to authenticated
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_locations.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_locations_update_own" on public.trip_locations;
create policy "trip_locations_update_own"
on public.trip_locations for update
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_locations.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_locations.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_locations_delete_own" on public.trip_locations;
create policy "trip_locations_delete_own"
on public.trip_locations for delete
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_locations.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_events_select_own" on public.trip_events;
create policy "trip_events_select_own"
on public.trip_events for select
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_events.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_events_insert_own" on public.trip_events;
create policy "trip_events_insert_own"
on public.trip_events for insert
to authenticated
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_events.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_events_update_own" on public.trip_events;
create policy "trip_events_update_own"
on public.trip_events for update
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_events.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_events.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "trip_events_delete_own" on public.trip_events;
create policy "trip_events_delete_own"
on public.trip_events for delete
to authenticated
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_events.trip_id
      and trips.user_id = auth.uid()
  )
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
