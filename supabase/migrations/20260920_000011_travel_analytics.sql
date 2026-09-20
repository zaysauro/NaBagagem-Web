-- Analytics support for travel statistics and persistent achievements.
-- Existing tables are intentionally reused; this migration only adds indexes
-- that keep the richer dashboard queries fast.

create index if not exists trips_user_dates_idx
  on public.trips(user_id,start_date,end_date);

create index if not exists trip_events_trip_date_idx
  on public.trip_events(trip_id,event_date);

create index if not exists trip_expenses_trip_date_idx
  on public.trip_expenses(trip_id,expense_date);

create index if not exists user_badges_user_earned_idx
  on public.user_badges(user_id,earned_at desc);
