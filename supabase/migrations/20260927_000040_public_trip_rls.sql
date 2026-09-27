drop policy if exists trips_select_collaborators on public.trips;
create policy trips_select_collaborators on public.trips
for select to authenticated
using (is_public = true or user_id = auth.uid() or public.is_trip_member(id, auth.uid()));

drop policy if exists trip_locations_select_collaborators on public.trip_locations;
create policy trip_locations_select_collaborators on public.trip_locations
for select to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_locations.trip_id
      and (t.is_public = true or t.user_id = auth.uid() or public.is_trip_member(t.id, auth.uid()))
  )
);

notify pgrst, 'reload schema';
