-- Repair user discovery/search for installations where profile policies,
-- profile backfill, or the search function were applied incompletely.

-- Make every existing account searchable through the public profile table.
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

-- Authenticated users may discover public profile information.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create index if not exists profiles_username_lower_idx
on public.profiles (lower(username));

create index if not exists profiles_display_name_lower_idx
on public.profiles (lower(display_name));

-- Search by display name, username, @username, or exact account email.
-- Email is only used as a lookup key and is never returned.
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
    select regexp_replace(lower(trim(coalesce(search_term, ''))), '^@+', '') as term
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio
  from public.profiles p
  join auth.users u on u.id = p.id
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
