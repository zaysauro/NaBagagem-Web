-- Final idempotent repair for user discovery/search.
-- Safe to run on installations where previous migrations were applied out of order.

-- 1. Keep the profile trigger correct for all future Auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Viajante'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 2. Repair profiles that were missed by the trigger in the past.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Viajante'
  )
from auth.users u
on conflict (id) do nothing;

-- 3. Profiles are discoverable by authenticated users.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

-- Keep the existing own insert/update policies if they exist.
-- They remain responsible for profile ownership.

create index if not exists profiles_username_lower_idx
on public.profiles (lower(username));

create index if not exists profiles_display_name_lower_idx
on public.profiles (lower(display_name));

-- 4. Recreate the search RPC.
-- Email is used only as an exact lookup key and is never returned.
create or replace function public.search_profiles(search_term text)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  bio text
)
language sql
security definer
set search_path = public, auth
stable
as $$
  with normalized as (
    select regexp_replace(
      lower(trim(coalesce(search_term, ''))),
      '^@+',
      ''
    ) as term
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio
  from public.profiles p
  join auth.users u
    on u.id = p.id
  cross join normalized n
  where auth.uid() is not null
    and n.term <> ''
    and (
      lower(coalesce(p.username, '')) like '%' || n.term || '%'
      or lower(coalesce(p.display_name, '')) like '%' || n.term || '%'
      or lower(coalesce(u.email, '')) = n.term
    )
  order by
    case
      when lower(coalesce(p.username, '')) = n.term then 0
      when lower(coalesce(p.display_name, '')) = n.term then 1
      when lower(coalesce(u.email, '')) = n.term then 2
      else 3
    end,
    lower(coalesce(p.display_name, p.username, ''))
  limit 20;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- 5. Final integrity check: this should return zero after this migration.
-- select count(*)
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;
