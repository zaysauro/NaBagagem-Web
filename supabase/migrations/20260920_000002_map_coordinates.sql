alter table public.trip_locations
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists trip_locations_coordinates_idx
  on public.trip_locations(latitude, longitude);
