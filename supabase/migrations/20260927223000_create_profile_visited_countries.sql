create table if not exists public.profile_visited_countries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  created_at timestamptz not null default now(),
  unique (user_id, country)
);

create index if not exists profile_visited_countries_user_id_idx
  on public.profile_visited_countries(user_id);

alter table public.profile_visited_countries enable row level security;

drop policy if exists "Users can view their own visited countries" on public.profile_visited_countries;
create policy "Users can view their own visited countries"
  on public.profile_visited_countries
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own visited countries" on public.profile_visited_countries;
create policy "Users can insert their own visited countries"
  on public.profile_visited_countries
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own visited countries" on public.profile_visited_countries;
create policy "Users can delete their own visited countries"
  on public.profile_visited_countries
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.profile_visited_countries to authenticated;

notify pgrst, 'reload schema';
