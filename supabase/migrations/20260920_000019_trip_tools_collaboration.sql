drop policy if exists "trip_expenses_owner_all" on public.trip_expenses;
create policy "trip_expenses_members_select" on public.trip_expenses
for select to authenticated using (public.is_trip_member(trip_id, auth.uid()));
create policy "trip_expenses_members_write" on public.trip_expenses
for all to authenticated using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_checklist_owner_all" on public.trip_checklist_items;
create policy "trip_checklist_members_select" on public.trip_checklist_items
for select to authenticated using (public.is_trip_member(trip_id, auth.uid()));
create policy "trip_checklist_members_write" on public.trip_checklist_items
for all to authenticated using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));

alter publication supabase_realtime add table public.trip_expenses;
alter publication supabase_realtime add table public.trip_checklist_items;
