-- Repair migration for installations where the social/notification migrations
-- were not applied in order. Safe to run more than once.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trip_reminders boolean not null default true,
  reservation_reminders boolean not null default true,
  social_notifications boolean not null default true,
  weather_alerts boolean not null default true,
  system_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification preferences own select" on public.notification_preferences;
create policy "notification preferences own select"
on public.notification_preferences for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "notification preferences own insert" on public.notification_preferences;
create policy "notification preferences own insert"
on public.notification_preferences for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notification preferences own update" on public.notification_preferences;
create policy "notification preferences own update"
on public.notification_preferences for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notification preferences own delete" on public.notification_preferences;
create policy "notification preferences own delete"
on public.notification_preferences for delete to authenticated
using (auth.uid() = user_id);

insert into public.notification_preferences(user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notification_preferences on auth.users;
create trigger on_auth_user_created_notification_preferences
after insert on auth.users
for each row execute procedure public.handle_new_user_notification_preferences();

-- Make every existing authenticated account discoverable through profiles.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'display_name',''), split_part(u.email,'@',1), 'Viajante')
from auth.users u
on conflict (id) do nothing;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select to authenticated
using (true);

create index if not exists profiles_username_idx on public.profiles(lower(username));
create index if not exists profiles_display_name_idx on public.profiles(lower(display_name));
