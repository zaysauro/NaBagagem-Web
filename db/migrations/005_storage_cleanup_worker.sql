-- Additive worker state; existing reservations retain their original not_before.
alter table app_private.storage_deletions
  add column attempts integer not null default 0,
  add column lease_token uuid,
  add column lease_until timestamptz;
create index storage_deletions_due_idx on app_private.storage_deletions(not_before,created_at);
create index storage_deletions_path_idx on app_private.storage_deletions(storage_path);
create index feed_media_storage_path_idx on public.feed_post_media(storage_path);

-- Paths are single-use. Retain the tombstone after deleting a queue job so a
-- delayed upload response cannot attach metadata to an already deleted object.
create table app_private.storage_tombstones (
  storage_path text primary key,
  deleted_at timestamptz not null default now()
);
revoke all on app_private.storage_tombstones from public,nabagagem_app;

create or replace function app_private.guard_storage_reference() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('nabagagem-storage:'||new.storage_path,0));
  if exists(select 1 from app_private.storage_tombstones where storage_path=new.storage_path)
     or exists(select 1 from app_private.storage_deletions where storage_path=new.storage_path and lease_token is not null) then
    raise exception 'Storage path is no longer available' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function app_private.guard_storage_reference() from public;
create trigger storage_reference_guard before insert or update of storage_path on public.trip_photos
  for each row execute function app_private.guard_storage_reference();
create trigger storage_reference_guard before insert or update of storage_path on public.trip_documents
  for each row execute function app_private.guard_storage_reference();
create trigger storage_reference_guard before insert or update of storage_path on public.feed_post_media
  for each row execute function app_private.guard_storage_reference();

create or replace function app_private.reserve_upload(path text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare job uuid;
begin
  if app_private.uid() is null or left(path,length(app_private.uid())+1)<>app_private.uid()||'/' or path like '%..%' then
    raise exception 'Invalid upload path' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nabagagem-storage:'||path,0));
  if exists(select 1 from app_private.storage_tombstones where storage_path=path)
     or exists(select 1 from app_private.storage_deletions where storage_path=path and lease_token is not null) then
    raise exception 'Storage path is no longer available' using errcode='42501';
  end if;
  insert into app_private.storage_deletions(actor_id,storage_path,not_before)
    values(app_private.uid(),path,now()+interval '1 day') returning id into job;
  return job;
end $$;
revoke all on function app_private.reserve_upload(text) from public;
grant execute on function app_private.reserve_upload(text) to nabagagem_app;

-- User requests may complete their unclaimed upload reservations, but cannot
-- erase a worker's durable claim while an external delete may still be running.
create or replace function app_private.complete_storage_deletion(job uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare path text;
begin
  select storage_path into path from app_private.storage_deletions where id=job and actor_id=app_private.uid();
  if path is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('nabagagem-storage:'||path,0));
  delete from app_private.storage_deletions where id=job and actor_id=app_private.uid() and lease_token is null;
end $$;
revoke all on function app_private.complete_storage_deletion(uuid) from public;
grant execute on function app_private.complete_storage_deletion(uuid) to nabagagem_app;

create or replace function app_private.pending_storage_deletions() returns table(id uuid,storage_path text)
language sql stable security definer set search_path=pg_catalog,public as $$
  select id,storage_path from app_private.storage_deletions
  where actor_id=app_private.uid() and not_before<=now() and lease_token is null order by created_at limit 50
$$;
