-- Domain constraints and service functions. Applied once by the checksum ledger.
alter table public.trip_locations add constraint locations_coordinates check ((latitude is null or latitude between -90 and 90) and (longitude is null or longitude between -180 and 180));
alter table public.trip_events add constraint events_coordinates check ((latitude is null or latitude between -90 and 90) and (longitude is null or longitude between -180 and 180));
alter table public.trip_events add constraint events_day_positive check (day_index > 0);
alter table public.trip_expenses add constraint expenses_amount_positive check (amount >= 0), add constraint expenses_currency_valid check (currency ~ '^[A-Z]{3}$');
alter table public.trips add constraint trips_title_valid check (length(trim(title)) between 1 and 120), add constraint trips_currency_valid check (budget_currency ~ '^[A-Z]{3}$'), add column source_trip_id uuid references public.trips(id) on delete set null;
alter table public.feed_comments add constraint comments_body_valid check (length(trim(body)) between 1 and 5000);
alter table public.feed_posts add constraint posts_body_length check (length(body) <= 10000);
create unique index if not exists notifications_dedupe_key_idx on public.notifications(dedupe_key);
create unique index if not exists visited_country_code_idx on public.profile_visited_countries(user_id,country_code);

create or replace function app_private.event_location_valid() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.location_id is not null and not exists(select from public.trip_locations where id=new.location_id and trip_id=new.trip_id) then raise exception 'Location belongs to a different trip' using errcode='23514'; end if;
 return new;
end $$;
create trigger event_location_valid before insert or update on public.trip_events for each row execute function app_private.event_location_valid();

create or replace function app_private.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger trips_updated before update on public.trips for each row execute function app_private.touch_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function app_private.touch_updated_at();

create or replace function public.search_profiles(search_query text,limit_count integer default 20)
returns table(id text,display_name text,username text,avatar_url text,bio text)
language sql stable security invoker set search_path=pg_catalog,public as $$
 select p.id::text,p.display_name,p.username,p.avatar_url,p.bio from public.profiles p
 where app_private.uid() is not null and length(trim(search_query)) >= 2
 and (p.username ilike '%'||search_query||'%' or p.display_name ilike '%'||search_query||'%')
 order by p.username nulls last limit least(greatest(limit_count,1),30)
$$;
create or replace function public.profile_contribution_score(p_user_id text) returns integer language sql stable security invoker set search_path=pg_catalog,public as $$
 select count(*)::integer from public.feed_posts where user_id::text=p_user_id
$$;
revoke all on function public.search_profiles(text,integer),public.profile_contribution_score(text) from public;
grant execute on function public.search_profiles(text,integer),public.profile_contribution_score(text) to nabagagem_app;

create or replace function app_private.social_notification() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare recipient text; actor text; event_type text; key text;
begin
 if TG_TABLE_NAME='user_follows' then recipient=new.following_id::text; actor=new.follower_id::text; event_type='follow'; key='follow:'||actor||':'||recipient;
 else
  select user_id::text into recipient from public.feed_posts where id=new.post_id;
  actor=new.user_id::text;
  event_type=case when TG_TABLE_NAME='feed_likes' then 'like' else 'comment' end;
  key=event_type||':'||new.post_id::text||':'||actor;
 end if;
 if recipient is distinct from actor and coalesce((select social_notifications from public.notification_preferences where user_id::text=recipient),true) then
  insert into public.notifications(user_id,actor_id,type,title,href,dedupe_key)
  select p.id,a.id,event_type,case event_type when 'like' then 'Sua publicação recebeu uma curtida' when 'comment' then 'Sua publicação recebeu um comentário' else 'Você tem um novo seguidor' end,'/feed',key
  from public.profiles p,public.profiles a where p.id::text=recipient and a.id::text=actor on conflict(dedupe_key) do nothing;
 end if;
 return new;
end $$;
create trigger notify_like after insert on public.feed_likes for each row execute function app_private.social_notification();
create trigger notify_comment after insert on public.feed_comments for each row execute function app_private.social_notification();
create trigger notify_follow after insert on public.user_follows for each row execute function app_private.social_notification();

-- Token hash is supplied by the server; email identity is read from managed Auth.
create or replace function app_private.accept_invitation(hash text) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare invitation public.trip_invitations; verified_email text; result uuid;
begin
 if app_private.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select lower(email) into verified_email from neon_auth."user" where id::text=app_private.uid() and "emailVerified"=true;
 select * into invitation from public.trip_invitations where token_hash=hash for update;
 if invitation.id is null or invitation.expires_at<=now() or invitation.accepted_at is not null or lower(invitation.email) is distinct from verified_email then raise exception 'Invalid invitation' using errcode='42501'; end if;
 if not exists(select from public.trips where id=invitation.trip_id and user_id=invitation.invited_by) then raise exception 'Invalid owner' using errcode='42501'; end if;
 insert into public.trip_members(trip_id,user_id,role) select invitation.trip_id,id,invitation.role from public.profiles where id::text=app_private.uid() on conflict(trip_id,user_id) do nothing;
 update public.trip_invitations set accepted_at=now() where id=invitation.id;
 result=invitation.trip_id;
 return result;
end $$;
revoke all on function app_private.accept_invitation(text) from public;
grant execute on function app_private.accept_invitation(text) to nabagagem_app;

-- Persistent per-user limiter for social writes (works across serverless instances).
create table app_private.write_limits(user_id text primary key,window_start timestamptz not null,hits integer not null);
create or replace function app_private.limit_social_writes() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare hits integer;
begin
 insert into app_private.write_limits as current(user_id,window_start,hits) values(app_private.uid(),now(),1)
 on conflict(user_id) do update set hits=case when current.window_start < now()-interval '1 minute' then 1 else current.hits+1 end,window_start=case when current.window_start < now()-interval '1 minute' then now() else current.window_start end
 returning current.hits into hits;
 if hits>30 then raise exception 'Too many writes' using errcode='54000'; end if;
 return new;
end $$;
create trigger limit_posts before insert on public.feed_posts for each row execute function app_private.limit_social_writes();
create trigger limit_comments before insert on public.feed_comments for each row execute function app_private.limit_social_writes();
create trigger limit_likes before insert on public.feed_likes for each row execute function app_private.limit_social_writes();
create trigger limit_invitations before insert on public.trip_invitations for each row execute function app_private.limit_social_writes();
revoke all on all functions in schema app_private from public;

-- Durable cleanup outbox survives cascading metadata deletion and storage outages.
create table app_private.storage_deletions(id uuid primary key default gen_random_uuid(),actor_id text not null,storage_path text not null,created_at timestamptz not null default now());
create or replace function app_private.queue_storage_delete() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$ begin
 insert into app_private.storage_deletions(actor_id,storage_path) values(coalesce(app_private.uid(),old.user_id::text),old.storage_path); return old;
end $$;
create trigger queue_photo_delete after delete on public.trip_photos for each row execute function app_private.queue_storage_delete();
create trigger queue_document_delete after delete on public.trip_documents for each row execute function app_private.queue_storage_delete();
create trigger queue_feed_media_delete after delete on public.feed_post_media for each row execute function app_private.queue_storage_delete();
create or replace function app_private.pending_storage_deletions() returns table(id uuid,storage_path text) language sql stable security definer set search_path=pg_catalog,public as $$ select id,storage_path from app_private.storage_deletions where actor_id=app_private.uid() order by created_at limit 50 $$;
create or replace function app_private.complete_storage_deletion(job uuid) returns void language sql security definer set search_path=pg_catalog,public as $$ delete from app_private.storage_deletions where id=job and actor_id=app_private.uid() $$;
revoke all on all functions in schema app_private from public;
grant execute on function app_private.pending_storage_deletions(),app_private.complete_storage_deletion(uuid) to nabagagem_app;

create or replace function app_private.record_trip_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare t uuid;
begin
 t=case when TG_OP='DELETE' then old.trip_id else new.trip_id end;
 if exists(select from public.trips where id=t) then
  insert into public.trip_activity(trip_id,actor_id,action) select t,id,lower(TG_OP)||':'||TG_TABLE_NAME from public.profiles where id::text=app_private.uid();
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger itinerary_history after insert or update or delete on public.trip_events for each row execute function app_private.record_trip_change();
create trigger destination_history after insert or update or delete on public.trip_locations for each row execute function app_private.record_trip_change();
create trigger expense_history after insert or update or delete on public.trip_expenses for each row execute function app_private.record_trip_change();
revoke all on function app_private.record_trip_change() from public;

alter table public.feed_comments add column moderation_state text not null default 'pending' check(moderation_state in ('pending','approved','hidden'));
create or replace function app_private.comment_state() returns trigger language plpgsql as $$ begin
 new.moderation_state=case when new.approved then 'approved' when TG_OP='UPDATE' then 'hidden' else 'pending' end; return new;
end $$;
-- Alphabetical trigger ordering puts this after app_comment_moderation.
create trigger z_comment_state before insert or update on public.feed_comments for each row execute function app_private.comment_state();
revoke all on function app_private.comment_state() from public;
