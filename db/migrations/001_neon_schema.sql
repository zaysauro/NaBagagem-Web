-- Native Neon schema; legacy Supabase migrations are historical and MUST NOT be replayed.
-- Run in a transaction using scripts/migrate.mjs. Does not alter neon_auth.
do $migration$
declare uid_type text;
begin
 select format_type(a.atttypid,a.atttypmod) into uid_type
 from pg_attribute a where a.attrelid=to_regclass('neon_auth."user"') and a.attname='id' and not a.attisdropped;
 if uid_type is null or uid_type not in ('text','uuid','character varying') then
   raise exception 'Unsupported or absent Neon Auth user identifier type';
 end if;
 execute replace($schema$
create table if not exists public.profiles (
  id __UID__ primary key references neon_auth."user"(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id __UID__ not null references public.profiles(id) on delete cascade,
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

create table if not exists public.trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique(trip_id, user_id)
);

create table if not exists public.travel_stats (
  user_id __UID__ primary key references neon_auth."user"(id) on delete cascade,
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
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_key)
);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  title text,
  body text,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id, user_id)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  body text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id __UID__ not null references public.profiles(id) on delete cascade,
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

create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id, user_id)
);

create table if not exists public.user_follows (
  follower_id __UID__ not null references public.profiles(id) on delete cascade,
  following_id __UID__ not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create table if not exists public.user_blocks (
  blocker_id __UID__ not null references public.profiles(id) on delete cascade,
  blocked_id __UID__ not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  actor_id __UID__ references public.profiles(id) on delete set null,
  type text not null check (type in ('like','comment','follow','trip_reminder','weather_alert','system')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id __UID__ primary key references neon_auth."user"(id) on delete cascade,
  trip_reminders boolean not null default true,
  reservation_reminders boolean not null default true,
  social_notifications boolean not null default true,
  weather_alerts boolean not null default true,
  system_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  name text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint profile_interests_unique_destination
    unique (user_id, name, city, country)
);

create table if not exists public.profile_visited_countries (
  id uuid primary key default gen_random_uuid(),
  user_id __UID__ not null references public.profiles(id) on delete cascade,
  country text not null,
  created_at timestamptz not null default now(),
  unique (user_id, country)
);
alter table public.trips add column if not exists share_token text unique, add column if not exists is_public boolean not null default false, add column if not exists budget_amount numeric(14,2) check (budget_amount >= 0), add column if not exists budget_currency text not null default 'BRL', add column if not exists status text not null default 'planned' check (status in ('planned','ongoing','completed','archived')), add column if not exists country text, add column if not exists city text;
alter table public.trip_events add column if not exists day_index integer not null default 1, add column if not exists status text not null default 'future', add column if not exists color text not null default '#111827', add column if not exists order_index integer not null default 0, add column if not exists reservation_name text, add column if not exists confirmation_code text, add column if not exists reservation_url text, add column if not exists reminder_minutes integer, add column if not exists activity_type text not null default 'activity', add column if not exists duration_minutes integer check (duration_minutes >= 0), add column if not exists address text, add column if not exists cost numeric(14,2) check (cost >= 0);
alter table public.feed_post_media add column if not exists user_id __UID__ references public.profiles(id) on delete cascade, add column if not exists public_url text, add column if not exists mime_type text, add column if not exists size_bytes bigint, add column if not exists width integer, add column if not exists height integer;
alter table public.travel_stats add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists locale text not null default 'pt-BR' check (locale in ('pt-BR','en','ja')), add column if not exists currency text not null default 'BRL', add column if not exists residence_country text, add column if not exists moderate_comments boolean not null default true;
alter table public.profile_visited_countries add column if not exists country_code text check (country_code ~ '^[A-Z]{2}$'), add column if not exists visited_at date, add column if not exists trip_id uuid references public.trips(id) on delete set null, add column if not exists notes text;
alter table public.trip_checklist_items add column if not exists category text not null default 'general', add column if not exists description text, add column if not exists due_date date, add column if not exists priority text not null default 'normal' check (priority in ('low','normal','high')), add column if not exists assignee_id __UID__ references public.profiles(id) on delete set null;
alter table public.trip_expenses add column if not exists original_amount numeric(14,2), add column if not exists original_currency text, add column if not exists exchange_rate numeric(20,8), add column if not exists exchange_date date;
alter table public.feed_comments alter column approved set default false;
create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username));

create table if not exists public.packing_lists (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120), created_at timestamptz not null default now()
);
create table if not exists public.packing_items (
 id uuid primary key default gen_random_uuid(), list_id uuid not null references public.packing_lists(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 200), category text, quantity integer not null default 1 check (quantity between 1 and 999),
 status text not null default 'pending' check (status in ('pending','prepared','packed')), notes text, assignee_id __UID__ references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.trip_documents (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 user_id __UID__ not null references public.profiles(id) on delete cascade, storage_path text not null unique,
 name text not null, category text not null default 'other', description text, mime_type text not null,
 size_bytes bigint not null check (size_bytes between 1 and 8388608), created_at timestamptz not null default now()
);
create table if not exists public.trip_photos (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 user_id __UID__ not null references public.profiles(id) on delete cascade, storage_path text not null unique,
 name text not null, caption text, mime_type text not null, size_bytes bigint not null check (size_bytes between 1 and 8388608),
 width integer, height integer, latitude double precision, longitude double precision, created_at timestamptz not null default now()
);
create table if not exists public.trip_templates (
 id uuid primary key default gen_random_uuid(), user_id __UID__ not null references public.profiles(id) on delete cascade,
 name text not null, items jsonb not null default '[]', created_at timestamptz not null default now()
);
create table if not exists public.saved_itineraries (
 user_id __UID__ not null references public.profiles(id) on delete cascade, trip_id uuid not null references public.trips(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,trip_id)
);
create table if not exists public.trip_invitations (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 invited_by __UID__ not null references public.profiles(id) on delete cascade, email text not null,
 role text not null default 'viewer' check (role in ('editor','viewer')), token_hash text not null unique,
 expires_at timestamptz not null, accepted_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.trip_activity (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 actor_id __UID__ references public.profiles(id) on delete set null, action text not null, created_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trip_locations_trip_id_idx on public.trip_locations(trip_id);
create index if not exists trip_events_trip_id_idx on public.trip_events(trip_id);
create index if not exists trip_events_location_id_idx on public.trip_events(location_id);
create index if not exists trip_expenses_trip_id_idx on public.trip_expenses(trip_id);
create index if not exists trip_checklist_items_trip_id_idx on public.trip_checklist_items(trip_id);
create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists trip_members_user_id_idx on public.trip_members(user_id);
create index if not exists user_badges_user_id_idx on public.user_badges(user_id);
create index if not exists feed_posts_user_id_idx on public.feed_posts(user_id);
create index if not exists feed_posts_trip_id_idx on public.feed_posts(trip_id);
create index if not exists feed_likes_post_id_idx on public.feed_likes(post_id);
create index if not exists feed_likes_user_id_idx on public.feed_likes(user_id);
create index if not exists feed_comments_post_id_idx on public.feed_comments(post_id);
create index if not exists feed_comments_user_id_idx on public.feed_comments(user_id);
create index if not exists feed_reports_post_id_idx on public.feed_reports(post_id);
create index if not exists feed_reports_user_id_idx on public.feed_reports(user_id);
create index if not exists feed_post_media_post_id_idx on public.feed_post_media(post_id);
create index if not exists feed_bookmarks_post_id_idx on public.feed_bookmarks(post_id);
create index if not exists feed_bookmarks_user_id_idx on public.feed_bookmarks(user_id);
create index if not exists user_follows_follower_id_idx on public.user_follows(follower_id);
create index if not exists user_follows_following_id_idx on public.user_follows(following_id);
create index if not exists user_blocks_blocker_id_idx on public.user_blocks(blocker_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
create index if not exists profile_interests_user_id_idx on public.profile_interests(user_id);
create index if not exists profile_visited_countries_user_id_idx on public.profile_visited_countries(user_id);
create index if not exists packing_lists_trip_id_idx on public.packing_lists(trip_id);
create index if not exists packing_items_list_id_idx on public.packing_items(list_id);
create index if not exists packing_items_assignee_id_idx on public.packing_items(assignee_id);
create index if not exists trip_documents_trip_id_idx on public.trip_documents(trip_id);
create index if not exists trip_documents_user_id_idx on public.trip_documents(user_id);
create index if not exists trip_photos_trip_id_idx on public.trip_photos(trip_id);
create index if not exists trip_photos_user_id_idx on public.trip_photos(user_id);
create index if not exists trip_templates_user_id_idx on public.trip_templates(user_id);
create index if not exists saved_itineraries_user_id_idx on public.saved_itineraries(user_id);
create index if not exists saved_itineraries_trip_id_idx on public.saved_itineraries(trip_id);
create index if not exists trip_invitations_trip_id_idx on public.trip_invitations(trip_id);
create index if not exists trip_invitations_invited_by_idx on public.trip_invitations(invited_by);
create index if not exists trip_activity_trip_id_idx on public.trip_activity(trip_id);
create index if not exists trip_activity_actor_id_idx on public.trip_activity(actor_id);
$schema$, '__UID__',uid_type);
end $migration$;
