-- Search users by public profile fields and by exact account email without exposing email.
-- Email is only a lookup key; it is never returned to the browser.

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
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and (
      lower(coalesce(p.username, '')) like '%' || lower(trim(search_term)) || '%'
      or lower(coalesce(p.display_name, '')) like '%' || lower(trim(search_term)) || '%'
      or lower(coalesce(u.email, '')) = lower(trim(search_term))
    )
  order by
    case
      when lower(coalesce(p.username, '')) = lower(trim(search_term)) then 0
      when lower(coalesce(p.display_name, '')) = lower(trim(search_term)) then 1
      when lower(coalesce(u.email, '')) = lower(trim(search_term)) then 2
      else 3
    end,
    lower(coalesce(p.display_name, p.username, ''))
  limit 20;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;
