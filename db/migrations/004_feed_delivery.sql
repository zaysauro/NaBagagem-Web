-- Forward-only: preserve historical migrations and existing rows.
create index if not exists feed_posts_cursor_idx on public.feed_posts(created_at desc,id desc);

-- Serialize concurrent uploads for one post before checking capacity.
create or replace function app_private.feed_media_capacity() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 perform id from public.feed_posts where id=new.post_id for update;
 if not found then raise exception 'Post unavailable' using errcode='42501'; end if;
 if (select count(*) from public.feed_post_media where post_id=new.post_id)>=5 then
  raise exception 'Photo limit exceeded' using errcode='23514';
 end if;
 return new;
end $$;
create trigger feed_media_capacity before insert on public.feed_post_media
for each row execute function app_private.feed_media_capacity();
revoke all on function app_private.feed_media_capacity() from public;

-- Reserve cleanup before uploading. A server interruption must not lose the path.
alter table app_private.storage_deletions add column not_before timestamptz not null default now();
create or replace function app_private.reserve_upload(path text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare job uuid;
begin
 if app_private.uid() is null or left(path,length(app_private.uid())+1)<>app_private.uid()||'/' or path like '%..%' then
  raise exception 'Invalid upload path' using errcode='42501';
 end if;
 insert into app_private.storage_deletions(actor_id,storage_path,not_before)
 values(app_private.uid(),path,now()+interval '1 day') returning id into job;
 return job;
end $$;
create or replace function app_private.pending_storage_deletions() returns table(id uuid,storage_path text)
language sql stable security definer set search_path=pg_catalog,public as $$
 select id,storage_path from app_private.storage_deletions
 where actor_id=app_private.uid() and not_before<=now() order by created_at limit 50
$$;
revoke all on function app_private.reserve_upload(text) from public;
grant execute on function app_private.reserve_upload(text) to nabagagem_app;
