-- Per-user notification preferences.
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
  on public.notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "notification preferences own insert" on public.notification_preferences;
create policy "notification preferences own insert"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "notification preferences own update" on public.notification_preferences;
create policy "notification preferences own update"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notification preferences own delete" on public.notification_preferences;
create policy "notification preferences own delete"
  on public.notification_preferences for delete
  using (auth.uid() = user_id);

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
