alter table public.trips add column if not exists share_token text unique;
create index if not exists trips_share_token_idx on public.trips(share_token);
