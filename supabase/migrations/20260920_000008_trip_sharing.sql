alter table public.trips add column if not exists share_token text unique;
create index if not exists trips_share_token_idx on public.trips(share_token);

drop policy if exists "trips_select_shared" on public.trips;
create policy "trips_select_shared" on public.trips
for select to anon, authenticated using (share_token is not null);

drop policy if exists "trip_locations_select_shared" on public.trip_locations;
create policy "trip_locations_select_shared" on public.trip_locations
for select to anon, authenticated using (
  exists (select 1 from public.trips t where t.id=trip_locations.trip_id and t.share_token is not null)
);

drop policy if exists "trip_events_select_shared" on public.trip_events;
create policy "trip_events_select_shared" on public.trip_events
for select to anon, authenticated using (
  exists (select 1 from public.trips t where t.id=trip_events.trip_id and t.share_token is not null)
);
