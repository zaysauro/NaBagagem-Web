-- Planned budget for each trip
alter table public.trips
  add column if not exists budget_amount numeric(14,2),
  add column if not exists budget_currency text not null default 'BRL';

create index if not exists trips_budget_currency_idx on public.trips(budget_currency);
