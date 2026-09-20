create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists trip_members_user_id_idx on public.trip_members(user_id);

alter table public.trip_members enable row level security;

create or replace function public.is_trip_member(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = p_user_id
  ) or exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.user_id = p_user_id
  );
$$;

create or replace function public.can_edit_trip(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.user_id = p_user_id
  ) or exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = p_user_id and tm.role = 'editor'
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.user_id = p_user_id
  );
$$;

drop policy if exists "trip_members_select" on public.trip_members;
create policy "trip_members_select"
on public.trip_members for select
to authenticated
using (
  public.is_trip_member(trip_id, auth.uid())
);

drop policy if exists "trip_members_insert_owner" on public.trip_members;
create policy "trip_members_insert_owner"
on public.trip_members for insert
to authenticated
with check (
  public.is_trip_owner(trip_id, auth.uid())
  and user_id <> auth.uid()
);

drop policy if exists "trip_members_update_owner" on public.trip_members;
create policy "trip_members_update_owner"
on public.trip_members for update
to authenticated
using (public.is_trip_owner(trip_id, auth.uid()))
with check (
  public.is_trip_owner(trip_id, auth.uid())
  and role in ('editor','viewer')
);

drop policy if exists "trip_members_delete_owner_or_self" on public.trip_members;
create policy "trip_members_delete_owner_or_self"
on public.trip_members for delete
to authenticated
using (
  public.is_trip_owner(trip_id, auth.uid()) or user_id = auth.uid()
);

drop policy if exists "trips_select_members" on public.trips;
create policy "trips_select_members"
on public.trips for select
to authenticated
using (public.is_trip_member(id, auth.uid()));

drop policy if exists "trips_update_members" on public.trips;
create policy "trips_update_members"
on public.trips for update
to authenticated
using (public.can_edit_trip(id, auth.uid()))
with check (public.can_edit_trip(id, auth.uid()));

drop policy if exists "trip_locations_select_members" on public.trip_locations;
create policy "trip_locations_select_members"
on public.trip_locations for select
to authenticated
using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "trip_locations_insert_members" on public.trip_locations;
create policy "trip_locations_insert_members"
on public.trip_locations for insert
to authenticated
with check (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_locations_update_members" on public.trip_locations;
create policy "trip_locations_update_members"
on public.trip_locations for update
to authenticated
using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_locations_delete_members" on public.trip_locations;
create policy "trip_locations_delete_members"
on public.trip_locations for delete
to authenticated
using (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_events_select_members" on public.trip_events;
create policy "trip_events_select_members"
on public.trip_events for select
to authenticated
using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "trip_events_insert_members" on public.trip_events;
create policy "trip_events_insert_members"
on public.trip_events for insert
to authenticated
with check (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_events_update_members" on public.trip_events;
create policy "trip_events_update_members"
on public.trip_events for update
to authenticated
using (public.can_edit_trip(trip_id, auth.uid()))
with check (public.can_edit_trip(trip_id, auth.uid()));

drop policy if exists "trip_events_delete_members" on public.trip_events;
create policy "trip_events_delete_members"
on public.trip_events for delete
to authenticated
using (public.can_edit_trip(trip_id, auth.uid()));

alter publication supabase_realtime add table public.trip_members;
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.trip_locations;
alter publication supabase_realtime add table public.trip_events;

create or replace function public.notify_trip_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trip_title text;
  owner_id uuid;
begin
  select title, user_id into trip_title, owner_id from public.trips where id = new.trip_id;
  insert into public.notifications(user_id, actor_id, type, title, body, href)
  values (
    new.user_id,
    owner_id,
    'system',
    'Você foi adicionado a uma viagem',
    coalesce(trip_title, 'Uma viagem') || ' agora está disponível no seu NaBagagem.',
    '/dashboard/trips/' || new.trip_id
  );
  return new;
end;
$$;

drop trigger if exists trip_member_added_notification on public.trip_members;
create trigger trip_member_added_notification
after insert on public.trip_members
for each row execute procedure public.notify_trip_member_added();

drop index if exists trip_members_trip_user_idx;
create unique index if not exists trip_members_trip_user_idx on public.trip_members(trip_id, user_id);
