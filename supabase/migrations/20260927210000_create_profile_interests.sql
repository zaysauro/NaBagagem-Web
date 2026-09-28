-- Discovery interests
-- Run this migration in the Supabase SQL Editor.

create table if not exists public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint profile_interests_unique_destination
    unique (user_id, name, city, country)
);

create index if not exists profile_interests_user_id_idx
  on public.profile_interests(user_id);

create index if not exists profile_interests_city_idx
  on public.profile_interests(lower(city));

create index if not exists profile_interests_country_idx
  on public.profile_interests(lower(country));

alter table public.profile_interests enable row level security;

drop policy if exists "Users can view their own interests" on public.profile_interests;
create policy "Users can view their own interests"
  on public.profile_interests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own interests" on public.profile_interests;
create policy "Users can create their own interests"
  on public.profile_interests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own interests" on public.profile_interests;
create policy "Users can update their own interests"
  on public.profile_interests
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own interests" on public.profile_interests;
create policy "Users can delete their own interests"
  on public.profile_interests
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_interests to authenticated;
