-- Restore social notification triggers and correct reciprocal block visibility.
create or replace function public.can_view_feed_post(p_post_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.feed_posts p
    where p.id = p_post_id
      and (
        p.user_id = p_user_id
        or p.visibility = 'public'
        or (p.visibility = 'followers' and exists (
          select 1 from public.user_follows f
          where f.follower_id = p_user_id and f.following_id = p.user_id
        ))
      )
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = p_user_id and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = p_user_id)
      )
  );
$$;

create or replace function public.notify_feed_like()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  owner_id uuid;
  enabled boolean;
begin
  select user_id into owner_id from public.feed_posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then return new; end if;
  select coalesce(social_notifications,true) into enabled from public.notification_preferences where user_id=owner_id;
  if not coalesce(enabled,true) then return new; end if;
  insert into public.notifications(user_id,actor_id,type,title,body,href)
  values(owner_id,new.user_id,'like','Nova curtida','Alguém curtiu sua publicação.','/feed');
  return new;
end;
$$;

create or replace function public.notify_feed_comment()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  owner_id uuid;
  enabled boolean;
begin
  select user_id into owner_id from public.feed_posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then return new; end if;
  select coalesce(social_notifications,true) into enabled from public.notification_preferences where user_id=owner_id;
  if not coalesce(enabled,true) then return new; end if;
  insert into public.notifications(user_id,actor_id,type,title,body,href)
  values(owner_id,new.user_id,'comment','Novo comentário','Alguém comentou sua publicação.','/feed');
  return new;
end;
$$;

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  enabled boolean;
begin
  if new.follower_id = new.following_id then return new; end if;
  select coalesce(social_notifications,true) into enabled from public.notification_preferences where user_id=new.following_id;
  if not coalesce(enabled,true) then return new; end if;
  insert into public.notifications(user_id,actor_id,type,title,body,href)
  values(new.following_id,new.follower_id,'follow','Novo seguidor','Alguém começou a seguir você.','/perfil');
  return new;
end;
$$;

drop trigger if exists feed_like_notification on public.feed_likes;
create trigger feed_like_notification
after insert on public.feed_likes
for each row execute procedure public.notify_feed_like();

drop trigger if exists feed_comment_notification on public.feed_comments;
create trigger feed_comment_notification
after insert on public.feed_comments
for each row execute procedure public.notify_feed_comment();

drop trigger if exists follow_notification on public.user_follows;
create trigger follow_notification
after insert on public.user_follows
for each row execute procedure public.notify_follow();
