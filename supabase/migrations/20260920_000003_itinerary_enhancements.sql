alter table public.trip_events
  add column if not exists day_index integer not null default 1,
  add column if not exists status text not null default 'future',
  add column if not exists color text not null default '#111827';

alter table public.trip_events drop constraint if exists trip_events_status_check;
alter table public.trip_events add constraint trip_events_status_check check (status in ('completed', 'in_progress', 'future'));

alter table public.trip_events drop constraint if exists trip_events_day_index_check;
alter table public.trip_events add constraint trip_events_day_index_check check (day_index >= 1);

create index if not exists trip_events_trip_day_idx
  on public.trip_events(trip_id, day_index, event_date, start_time);
