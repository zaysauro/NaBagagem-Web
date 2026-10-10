-- Restrict every application query, even when the connection owner bypasses RLS.
do $$ begin
 if not exists(select from pg_roles where rolname='nabagagem_app') then create role nabagagem_app nologin nobypassrls; end if;
 execute format('grant nabagagem_app to %I',current_user);
end $$;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema public, app_private to nabagagem_app;
create or replace function app_private.uid() returns text language sql stable as $$ select nullif(current_setting('app.user_id',true),'') $$;
create or replace function app_private.trip_owner(t uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select from public.trips where id=t and user_id::text=app_private.uid()) $$;
create or replace function app_private.trip_read(t uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select from public.trips x where x.id=t and (x.user_id::text=app_private.uid() or exists(select from public.trip_members m where m.trip_id=t and m.user_id::text=app_private.uid()))) $$;
create or replace function app_private.trip_public(t uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select from public.trips x where x.id=t and (x.is_public or (x.share_token is not null and x.share_token=nullif(current_setting('app.share_token',true),'')))) $$;
create or replace function app_private.trip_edit(t uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select app_private.trip_owner(t) or exists(select from public.trip_members where trip_id=t and user_id::text=app_private.uid() and role='editor') $$;
create or replace function app_private.blocked(other text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select from public.user_blocks where (blocker_id::text=app_private.uid() and blocked_id::text=other) or (blocked_id::text=app_private.uid() and blocker_id::text=other)) $$;
create or replace function app_private.post_owner(p uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select from public.feed_posts where id=p and user_id::text=app_private.uid()) $$;
create or replace function app_private.post_read(p uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select from public.feed_posts x where x.id=p and not app_private.blocked(x.user_id::text) and (x.user_id::text=app_private.uid() or x.visibility='public' or (x.visibility='followers' and exists(select from public.user_follows f where f.follower_id::text=app_private.uid() and f.following_id=x.user_id)))) $$;
create or replace function app_private.list_read(l uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select from public.packing_lists where id=l and app_private.trip_read(trip_id)) $$;
create or replace function app_private.list_edit(l uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select from public.packing_lists where id=l and app_private.trip_edit(trip_id)) $$;
revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to nabagagem_app;

alter table public.profiles enable row level security;
grant select,insert,update,delete on public.profiles to nabagagem_app;
create policy app_select on public.profiles for select to nabagagem_app using (not app_private.blocked(id::text));
create policy app_insert on public.profiles for insert to nabagagem_app with check (id::text=app_private.uid());
create policy app_update on public.profiles for update to nabagagem_app using (id::text=app_private.uid()) with check (id::text=app_private.uid());

alter table public.trips enable row level security;
grant select,insert,update,delete on public.trips to nabagagem_app;
create policy app_select on public.trips for select to nabagagem_app using (user_id::text=app_private.uid() or app_private.trip_read(id) or app_private.trip_public(id));
create policy app_insert on public.trips for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.trips for update to nabagagem_app using (app_private.trip_edit(id)) with check (app_private.trip_edit(id));
create policy app_delete on public.trips for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.trip_locations enable row level security;
grant select,insert,update,delete on public.trip_locations to nabagagem_app;
create policy app_select on public.trip_locations for select to nabagagem_app using (app_private.trip_read(trip_id) or app_private.trip_public(trip_id));
create policy app_insert on public.trip_locations for insert to nabagagem_app with check (app_private.trip_edit(trip_id));
create policy app_update on public.trip_locations for update to nabagagem_app using (app_private.trip_edit(trip_id)) with check (app_private.trip_edit(trip_id));
create policy app_delete on public.trip_locations for delete to nabagagem_app using (app_private.trip_edit(trip_id));

alter table public.trip_events enable row level security;
grant select,insert,update,delete on public.trip_events to nabagagem_app;
create policy app_select on public.trip_events for select to nabagagem_app using (app_private.trip_read(trip_id) or app_private.trip_public(trip_id));
create policy app_insert on public.trip_events for insert to nabagagem_app with check (app_private.trip_edit(trip_id));
create policy app_update on public.trip_events for update to nabagagem_app using (app_private.trip_edit(trip_id)) with check (app_private.trip_edit(trip_id));
create policy app_delete on public.trip_events for delete to nabagagem_app using (app_private.trip_edit(trip_id));

alter table public.trip_expenses enable row level security;
grant select,insert,update,delete on public.trip_expenses to nabagagem_app;
create policy app_select on public.trip_expenses for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.trip_expenses for insert to nabagagem_app with check (app_private.trip_edit(trip_id));
create policy app_update on public.trip_expenses for update to nabagagem_app using (app_private.trip_edit(trip_id)) with check (app_private.trip_edit(trip_id));
create policy app_delete on public.trip_expenses for delete to nabagagem_app using (app_private.trip_edit(trip_id));

alter table public.trip_checklist_items enable row level security;
grant select,insert,update,delete on public.trip_checklist_items to nabagagem_app;
create policy app_select on public.trip_checklist_items for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.trip_checklist_items for insert to nabagagem_app with check (app_private.trip_edit(trip_id));
create policy app_update on public.trip_checklist_items for update to nabagagem_app using (app_private.trip_edit(trip_id)) with check (app_private.trip_edit(trip_id));
create policy app_delete on public.trip_checklist_items for delete to nabagagem_app using (app_private.trip_edit(trip_id));

alter table public.trip_members enable row level security;
grant select,insert,update,delete on public.trip_members to nabagagem_app;
create policy app_select on public.trip_members for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.trip_members for insert to nabagagem_app with check (app_private.trip_owner(trip_id));
create policy app_update on public.trip_members for update to nabagagem_app using (app_private.trip_owner(trip_id)) with check (app_private.trip_owner(trip_id));
create policy app_delete on public.trip_members for delete to nabagagem_app using (app_private.trip_owner(trip_id) or user_id::text=app_private.uid());

alter table public.travel_stats enable row level security;
grant select,insert,update,delete on public.travel_stats to nabagagem_app;
create policy app_select on public.travel_stats for select to nabagagem_app using (user_id::text=app_private.uid() or is_public);
create policy app_insert on public.travel_stats for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.travel_stats for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.travel_stats for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.user_badges enable row level security;
grant select,insert,update,delete on public.user_badges to nabagagem_app;
create policy app_select on public.user_badges for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.user_badges for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.user_badges for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.user_badges for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.feed_posts enable row level security;
grant select,insert,update,delete on public.feed_posts to nabagagem_app;
create policy app_select on public.feed_posts for select to nabagagem_app using (user_id::text=app_private.uid() or app_private.post_read(id));
create policy app_insert on public.feed_posts for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.feed_posts for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.feed_posts for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.feed_likes enable row level security;
grant select,insert,update,delete on public.feed_likes to nabagagem_app;
create policy app_select on public.feed_likes for select to nabagagem_app using (app_private.post_read(post_id));
create policy app_insert on public.feed_likes for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.post_read(post_id));
create policy app_delete on public.feed_likes for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.feed_comments enable row level security;
grant select,insert,update,delete on public.feed_comments to nabagagem_app;
create policy app_select on public.feed_comments for select to nabagagem_app using (app_private.post_read(post_id) and (approved or user_id::text=app_private.uid() or app_private.post_owner(post_id)));
create policy app_insert on public.feed_comments for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.post_read(post_id));
create policy app_update on public.feed_comments for update to nabagagem_app using (app_private.post_owner(post_id)) with check (app_private.post_owner(post_id));
create policy app_delete on public.feed_comments for delete to nabagagem_app using (user_id::text=app_private.uid() or app_private.post_owner(post_id));

alter table public.feed_reports enable row level security;
grant select,insert,update,delete on public.feed_reports to nabagagem_app;
create policy app_select on public.feed_reports for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.feed_reports for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.post_read(post_id));
create policy app_delete on public.feed_reports for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.feed_post_media enable row level security;
grant select,insert,update,delete on public.feed_post_media to nabagagem_app;
create policy app_select on public.feed_post_media for select to nabagagem_app using (app_private.post_read(post_id));
create policy app_insert on public.feed_post_media for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.post_owner(post_id));
create policy app_delete on public.feed_post_media for delete to nabagagem_app using (app_private.post_owner(post_id));

alter table public.feed_bookmarks enable row level security;
grant select,insert,update,delete on public.feed_bookmarks to nabagagem_app;
create policy app_select on public.feed_bookmarks for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.feed_bookmarks for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.post_read(post_id));
create policy app_delete on public.feed_bookmarks for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.user_follows enable row level security;
grant select,insert,update,delete on public.user_follows to nabagagem_app;
create policy app_select on public.user_follows for select to nabagagem_app using (not app_private.blocked(follower_id::text) and not app_private.blocked(following_id::text));
create policy app_insert on public.user_follows for insert to nabagagem_app with check (follower_id::text=app_private.uid() and not app_private.blocked(following_id::text));
create policy app_delete on public.user_follows for delete to nabagagem_app using (follower_id::text=app_private.uid());

alter table public.user_blocks enable row level security;
grant select,insert,update,delete on public.user_blocks to nabagagem_app;
create policy app_select on public.user_blocks for select to nabagagem_app using (blocker_id::text=app_private.uid());
create policy app_insert on public.user_blocks for insert to nabagagem_app with check (blocker_id::text=app_private.uid());
create policy app_delete on public.user_blocks for delete to nabagagem_app using (blocker_id::text=app_private.uid());

alter table public.notifications enable row level security;
grant select,insert,update,delete on public.notifications to nabagagem_app;
create policy app_select on public.notifications for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.notifications for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.notifications for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.notifications for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.notification_preferences enable row level security;
grant select,insert,update,delete on public.notification_preferences to nabagagem_app;
create policy app_select on public.notification_preferences for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.notification_preferences for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.notification_preferences for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.notification_preferences for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.profile_interests enable row level security;
grant select,insert,update,delete on public.profile_interests to nabagagem_app;
create policy app_select on public.profile_interests for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.profile_interests for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.profile_interests for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.profile_interests for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.profile_visited_countries enable row level security;
grant select,insert,update,delete on public.profile_visited_countries to nabagagem_app;
create policy app_select on public.profile_visited_countries for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.profile_visited_countries for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.profile_visited_countries for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.profile_visited_countries for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.packing_lists enable row level security;
grant select,insert,update,delete on public.packing_lists to nabagagem_app;
create policy app_select on public.packing_lists for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.packing_lists for insert to nabagagem_app with check (app_private.trip_edit(trip_id));
create policy app_update on public.packing_lists for update to nabagagem_app using (app_private.trip_edit(trip_id)) with check (app_private.trip_edit(trip_id));
create policy app_delete on public.packing_lists for delete to nabagagem_app using (app_private.trip_edit(trip_id));

alter table public.packing_items enable row level security;
grant select,insert,update,delete on public.packing_items to nabagagem_app;
create policy app_select on public.packing_items for select to nabagagem_app using (app_private.list_read(list_id));
create policy app_insert on public.packing_items for insert to nabagagem_app with check (app_private.list_edit(list_id));
create policy app_update on public.packing_items for update to nabagagem_app using (app_private.list_edit(list_id)) with check (app_private.list_edit(list_id));
create policy app_delete on public.packing_items for delete to nabagagem_app using (app_private.list_edit(list_id));

alter table public.trip_documents enable row level security;
grant select,insert,update,delete on public.trip_documents to nabagagem_app;
create policy app_select on public.trip_documents for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.trip_documents for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.trip_edit(trip_id));
create policy app_update on public.trip_documents for update to nabagagem_app using (user_id::text=app_private.uid() and app_private.trip_edit(trip_id)) with check (user_id::text=app_private.uid() and app_private.trip_edit(trip_id));
create policy app_delete on public.trip_documents for delete to nabagagem_app using (app_private.trip_owner(trip_id) or (user_id::text=app_private.uid() and app_private.trip_edit(trip_id)));

alter table public.trip_photos enable row level security;
grant select,insert,update,delete on public.trip_photos to nabagagem_app;
create policy app_select on public.trip_photos for select to nabagagem_app using (app_private.trip_read(trip_id));
create policy app_insert on public.trip_photos for insert to nabagagem_app with check (user_id::text=app_private.uid() and app_private.trip_edit(trip_id));
create policy app_update on public.trip_photos for update to nabagagem_app using (user_id::text=app_private.uid() and app_private.trip_edit(trip_id)) with check (user_id::text=app_private.uid() and app_private.trip_edit(trip_id));
create policy app_delete on public.trip_photos for delete to nabagagem_app using (app_private.trip_owner(trip_id) or (user_id::text=app_private.uid() and app_private.trip_edit(trip_id)));

alter table public.trip_templates enable row level security;
grant select,insert,update,delete on public.trip_templates to nabagagem_app;
create policy app_select on public.trip_templates for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.trip_templates for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.trip_templates for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.trip_templates for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.saved_itineraries enable row level security;
grant select,insert,update,delete on public.saved_itineraries to nabagagem_app;
create policy app_select on public.saved_itineraries for select to nabagagem_app using (user_id::text=app_private.uid());
create policy app_insert on public.saved_itineraries for insert to nabagagem_app with check (user_id::text=app_private.uid());
create policy app_update on public.saved_itineraries for update to nabagagem_app using (user_id::text=app_private.uid()) with check (user_id::text=app_private.uid());
create policy app_delete on public.saved_itineraries for delete to nabagagem_app using (user_id::text=app_private.uid());

alter table public.trip_invitations enable row level security;
grant select,insert,update,delete on public.trip_invitations to nabagagem_app;
create policy app_select on public.trip_invitations for select to nabagagem_app using (app_private.trip_owner(trip_id));
create policy app_insert on public.trip_invitations for insert to nabagagem_app with check (invited_by::text=app_private.uid() and app_private.trip_owner(trip_id));
create policy app_delete on public.trip_invitations for delete to nabagagem_app using (app_private.trip_owner(trip_id));

alter table public.trip_activity enable row level security;
grant select,insert,update,delete on public.trip_activity to nabagagem_app;
create policy app_select on public.trip_activity for select to nabagagem_app using (app_private.trip_read(trip_id));

-- Ownership and parent resources cannot be reassigned through an update/upsert.
create or replace function app_private.immutable_owner() returns trigger language plpgsql as $$
declare k text;
begin
 foreach k in array array['id','user_id','trip_id','post_id','list_id','follower_id','following_id','blocker_id','blocked_id','invited_by','storage_path'] loop
  if to_jsonb(old)->k is distinct from to_jsonb(new)->k then raise exception 'Resource identity is immutable' using errcode='42501'; end if;
 end loop;
 if TG_TABLE_NAME='trips' then
 if (new.is_public is distinct from old.is_public or new.share_token is distinct from old.share_token) and old.user_id::text is distinct from app_private.uid() then raise exception 'Only the owner may share' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger app_immutable_owner before update on public.profiles for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trips for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_locations for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_events for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_expenses for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_checklist_items for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_members for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.travel_stats for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.user_badges for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_posts for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_likes for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_comments for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_reports for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_post_media for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.feed_bookmarks for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.user_follows for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.user_blocks for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.notifications for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.notification_preferences for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.profile_interests for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.profile_visited_countries for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.packing_lists for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.packing_items for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_documents for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_photos for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_templates for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.saved_itineraries for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_invitations for each row execute function app_private.immutable_owner();
create trigger app_immutable_owner before update on public.trip_activity for each row execute function app_private.immutable_owner();

create or replace function app_private.comment_moderation() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 select (p.user_id::text=app_private.uid() or not coalesce(u.moderate_comments,true)) into new.approved from public.feed_posts p join public.profiles u on u.id=p.user_id where p.id=new.post_id;
 return new;
end $$;
create trigger app_comment_moderation before insert on public.feed_comments for each row execute function app_private.comment_moderation();
-- Existing and future Auth users are bootstrapped without triggers on neon_auth.
insert into public.profiles(id,display_name) select id,name from neon_auth."user" on conflict(id) do nothing;
