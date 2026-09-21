-- NaBagagem complete platform schema
-- Run after 20260920_000001_initial_travel_schema.sql.
-- This migration consolidates the platform tables required by the current web app.

create extension if not exists pgcrypto;

-- Core trip enhancements
alter table public.trips
  add column if not exists share_token text unique;

create index if not exists trips_share_token_idx on public.trips(share_token);

alter table public.trip_events
  add column if not exists reservation_name text,
  add column if not exists confirmation_code text,
  add column if not exists reservation_url text,
  add column if not exists reminder_minutes integer;

create index if not exists trip_events_reservation_idx
  on public.trip_events(trip_id, reservation_url);

-- Expenses
create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  category text,
  expense_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_expenses_trip_id_idx on public.trip_expenses(trip_id);
create index if not exists trip_expenses_date_idx on public.trip_expenses(expense_date);

-- Checklist
create table if not exists public.trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_checklist_trip_id_idx on public.trip_checklist_items(trip_id);

-- Collaboration
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique(trip_id, user_id)
);
create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists trip_members_user_id_idx on public.trip_members(user_id);

create or replace function public.is_trip_member(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips
    where id = p_trip_id and user_id = p_user_id
  );
$$;

create or replace function public.can_edit_trip(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_trip_owner(p_trip_id, p_user_id)
      or exists (
        select 1 from public.trip_members
        where trip_id = p_trip_id and user_id = p_user_id and role = 'editor'
      );
$$;

-- Travel analytics / badges
create table if not exists public.travel_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trips integer not null default 0,
  countries integer not null default 0,
  cities integer not null default 0,
  kilometers numeric(12,2) not null default 0,
  travel_days integer not null default 0,
  itinerary_hours numeric(12,2) not null default 0,
  country_percentage numeric(8,4) not null default 0,
  total_expenses numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_key)
);
create index if not exists user_badges_user_id_idx on public.user_badges(user_id);

-- Social feed
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  title text,
  body text not null,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feed_posts_user_id_idx on public.feed_posts(user_id);
create index if not exists feed_posts_created_at_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_trip_id_idx on public.feed_posts(trip_id);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id, user_id)
);
create index if not exists feed_likes_user_id_idx on public.feed_likes(user_id);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feed_comments_post_id_idx on public.feed_comments(post_id);

create table if not exists public.feed_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image',
  created_at timestamptz not null default now()
);
create index if not exists feed_post_media_post_id_idx on public.feed_post_media(post_id);

create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id, user_id)
);

-- Social graph
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);
create index if not exists user_follows_following_idx on public.user_follows(following_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('like','comment','follow','trip_reminder','weather_alert','system')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key) where dedupe_key is not null;

-- Notification preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trip_reminders boolean not null default true,
  reservation_reminders boolean not null default true,
  social_notifications boolean not null default true,
  weather_alerts boolean not null default true,
  system_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.trip_expenses enable row level security;
alter table public.trip_checklist_items enable row level security;
alter table public.trip_members enable row level security;
alter table public.travel_stats enable row level security;
alter table public.user_badges enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reports enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_bookmarks enable row level security;
alter table public.user_follows enable row level security;
alter table public.user_blocks enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- Public profile visibility needed by social/search APIs.
drop policy if exists profiles_public_select on public.profiles;
create policy profiles_public_select on public.profiles
for select to authenticated
using (true);

-- Trip member policies
drop policy if exists trip_members_select on public.trip_members;
create policy trip_members_select on public.trip_members
for select to authenticated
using (
  public.is_trip_owner(trip_id, auth.uid()) or user_id = auth.uid()
  or public.is_trip_member(trip_id, auth.uid())
);

drop policy if exists trip_members_insert on public.trip_members;
create policy trip_members_insert on public.trip_members
for insert to authenticated
with check (public.is_trip_owner(trip_id, auth.uid()));

drop policy if exists trip_members_update on public.trip_members;
create policy trip_members_update on public.trip_members
for update to authenticated
using (public.is_trip_owner(trip_id, auth.uid()))
with check (public.is_trip_owner(trip_id, auth.uid()));

drop policy if exists trip_members_delete on public.trip_members;
create policy trip_members_delete on public.trip_members
for delete to authenticated
using (public.is_trip_owner(trip_id, auth.uid()) or user_id = auth.uid());

-- Replace trip RLS with owner/member-aware policies
drop policy if exists trips_select_own on public.trips;
drop policy if exists trips_update_own on public.trips;
create policy trips_select_collaborators on public.trips
for select to authenticated
using (user_id = auth.uid() or public.is_trip_member(id, auth.uid()));

create policy trips_update_editors on public.trips
for update to authenticated
using (public.can_edit_trip(id, auth.uid()))
with check (public.can_edit_trip(id, auth.uid()));

drop policy if exists trip_locations_select_own on public.trip_locations;
drop policy if exists trip_locations_insert_own on public.trip_locations;
drop policy if exists trip_locations_update_own on public.trip_locations;
drop policy if exists trip_locations_delete_own on public.trip_locations;
create policy trip_locations_select_collaborators on public.trip_locations
for select to authenticated
using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy trip_locations_insert_editors on public.trip_locations
for insert to authenticated
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_locations_update_editors on public.trip_locations
for update to authenticated
using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_locations_delete_editors on public.trip_locations
for delete to authenticated
using (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists trip_events_select_own on public.trip_events;
drop policy if exists trip_events_insert_own on public.trip_events;
drop policy if exists trip_events_update_own on public.trip_events;
drop policy if exists trip_events_delete_own on public.trip_events;
create policy trip_events_select_collaborators on public.trip_events
for select to authenticated
using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy trip_events_insert_editors on public.trip_events
for insert to authenticated
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_events_update_editors on public.trip_events
for update to authenticated
using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_events_delete_editors on public.trip_events
for delete to authenticated
using (public.can_edit_trip(trip_id, auth.uid()));

-- Expense/checklist policies
drop policy if exists trip_expenses_owner_all on public.trip_expenses;
create policy trip_expenses_select on public.trip_expenses
for select to authenticated
using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy trip_expenses_insert on public.trip_expenses
for insert to authenticated with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_expenses_update on public.trip_expenses
for update to authenticated using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_expenses_delete on public.trip_expenses
for delete to authenticated using (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists trip_checklist_owner_all on public.trip_checklist_items;
create policy trip_checklist_select on public.trip_checklist_items
for select to authenticated
using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy trip_checklist_insert on public.trip_checklist_items
for insert to authenticated with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_checklist_update on public.trip_checklist_items
for update to authenticated using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));
create policy trip_checklist_delete on public.trip_checklist_items
for delete to authenticated using (public.can_edit_trip(trip_id, auth.uid()));

-- Shared trip read access
drop policy if exists trips_shared_select on public.trips;
create policy trips_shared_select on public.trips
for select to anon, authenticated
using (share_token is not null);

drop policy if exists trip_locations_shared_select on public.trip_locations;
create policy trip_locations_shared_select on public.trip_locations
for select to anon, authenticated
using (exists (select 1 from public.trips where id = trip_locations.trip_id and share_token is not null));

drop policy if exists trip_events_shared_select on public.trip_events;
create policy trip_events_shared_select on public.trip_events
for select to anon, authenticated
using (exists (select 1 from public.trips where id = trip_events.trip_id and share_token is not null));

-- Social visibility helpers
create or replace function public.can_view_feed_post(p_post_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.feed_posts p
    where p.id = p_post_id
      and (
        p.user_id = p_user_id
        or p.visibility = 'public'
        or (p.visibility = 'followers' and exists (
          select 1 from public.user_follows f
          where f.follower_id = p_user_id and f.following_id = p.user_id
        ))
      )
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = p_user_id and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = p.user_id)
      )
  );
$$;

-- Feed policies
create policy feed_posts_select on public.feed_posts
for select to authenticated
using (public.can_view_feed_post(id, auth.uid()));

create policy feed_posts_insert on public.feed_posts
for insert to authenticated
with check (user_id = auth.uid());

create policy feed_posts_update on public.feed_posts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy feed_posts_delete on public.feed_posts
for delete to authenticated using (user_id = auth.uid());

create policy feed_likes_select on public.feed_likes
for select to authenticated
using (public.can_view_feed_post(post_id, auth.uid()) or user_id = auth.uid());
create policy feed_likes_insert on public.feed_likes
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));
create policy feed_likes_delete on public.feed_likes
for delete to authenticated
using (user_id = auth.uid());

create policy feed_comments_select on public.feed_comments
for select to authenticated
using (public.can_view_feed_post(post_id, auth.uid()));
create policy feed_comments_insert on public.feed_comments
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));
create policy feed_comments_update on public.feed_comments
for update to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy feed_comments_delete on public.feed_comments
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
);

create policy feed_reports_insert on public.feed_reports
for insert to authenticated with check (user_id = auth.uid());
create policy feed_reports_select_own on public.feed_reports
for select to authenticated using (user_id = auth.uid());

create policy feed_media_select on public.feed_post_media
for select to authenticated using (public.can_view_feed_post(post_id, auth.uid()));
create policy feed_media_insert on public.feed_post_media
for insert to authenticated
with check (exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid()));
create policy feed_media_delete on public.feed_post_media
for delete to authenticated
using (exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid()));

create policy feed_bookmarks_select on public.feed_bookmarks
for select to authenticated using (user_id = auth.uid());
create policy feed_bookmarks_insert on public.feed_bookmarks
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));
create policy feed_bookmarks_delete on public.feed_bookmarks
for delete to authenticated using (user_id = auth.uid());

-- Social graph policies
create policy user_follows_select on public.user_follows
for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
create policy user_follows_insert on public.user_follows
for insert to authenticated with check (follower_id = auth.uid());
create policy user_follows_delete on public.user_follows
for delete to authenticated using (follower_id = auth.uid());

create policy user_blocks_select on public.user_blocks
for select to authenticated using (blocker_id = auth.uid());
create policy user_blocks_insert on public.user_blocks
for insert to authenticated with check (blocker_id = auth.uid());
create policy user_blocks_delete on public.user_blocks
for delete to authenticated using (blocker_id = auth.uid());

-- Stats/badges
create policy travel_stats_select on public.travel_stats
for select to authenticated using (user_id = auth.uid());
create policy travel_stats_insert on public.travel_stats
for insert to authenticated with check (user_id = auth.uid());
create policy travel_stats_update on public.travel_stats
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_badges_select on public.user_badges
for select to authenticated using (user_id = auth.uid());
create policy user_badges_insert on public.user_badges
for insert to authenticated with check (user_id = auth.uid());

-- Notifications/preferences
create policy notifications_select on public.notifications
for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications
for delete to authenticated using (user_id = auth.uid());

create policy notification_preferences_select on public.notification_preferences
for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_insert on public.notification_preferences
for insert to authenticated with check (user_id = auth.uid());
create policy notification_preferences_update on public.notification_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Automatically create notification preferences for new users.
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.notification_preferences(user_id)
  values(new.id)
  on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notification_preferences on auth.users;
create trigger on_auth_user_created_notification_preferences
after insert on auth.users
for each row execute procedure public.handle_new_user_preferences();

-- Seed preferences for users that already exist.
insert into public.notification_preferences(user_id)
select id from auth.users
on conflict(user_id) do nothing;

-- Public media bucket.
insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do update set public = true;

drop policy if exists feed_media_storage_select on storage.objects;
create policy feed_media_storage_select on storage.objects
for select to public using (bucket_id = 'feed-media');

drop policy if exists feed_media_storage_insert on storage.objects;
create policy feed_media_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'feed-media' and owner_id = auth.uid()::text);

drop policy if exists feed_media_storage_delete on storage.objects;
create policy feed_media_storage_delete on storage.objects
for delete to authenticated
using (bucket_id = 'feed-media' and owner_id = auth.uid()::text);

-- Realtime: safely add tables if not already present.
do $$
begin
  begin alter publication supabase_realtime add table public.trip_locations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trip_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trips; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trip_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_likes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.user_follows; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.user_blocks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_bookmarks; exception when duplicate_object then null; end;
end $$;
