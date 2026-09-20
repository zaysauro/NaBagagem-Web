-- Reservation metadata for itinerary activities.
alter table public.trip_events
  add column if not exists reservation_name text,
  add column if not exists confirmation_code text,
  add column if not exists reservation_url text,
  add column if not exists reminder_minutes integer;

create index if not exists trip_events_reservation_idx
  on public.trip_events(trip_id, reservation_url);
