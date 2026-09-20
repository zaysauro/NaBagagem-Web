create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'BRL',
  expense_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create index if not exists trip_expenses_trip_idx on public.trip_expenses(trip_id, expense_date);
create index if not exists trip_checklist_trip_idx on public.trip_checklist_items(trip_id, completed, created_at);

alter table public.trip_expenses enable row level security;
alter table public.trip_checklist_items enable row level security;

drop policy if exists "trip_expenses_owner_all" on public.trip_expenses;
create policy "trip_expenses_owner_all" on public.trip_expenses
for all using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
)
with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
);

drop policy if exists "trip_checklist_owner_all" on public.trip_checklist_items;
create policy "trip_checklist_owner_all" on public.trip_checklist_items
for all using (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
)
with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
);
