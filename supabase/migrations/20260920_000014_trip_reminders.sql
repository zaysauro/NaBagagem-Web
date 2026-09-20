-- Trip and itinerary reminder support.
alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists trip_events_reminder_idx
  on public.trip_events(trip_id,event_date,start_time);

create index if not exists trips_reminder_dates_idx
  on public.trips(user_id,start_date,end_date);
