-- Automatic social notifications. SECURITY DEFINER is used so users never need direct INSERT access.
create or replace function public.notify_feed_like()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.feed_posts where id=NEW.post_id;
  if owner_id is not null and owner_id <> NEW.user_id then
    insert into public.notifications(user_id,actor_id,type,title,body,href)
    values(owner_id,NEW.user_id,'like','Nova curtida','Alguém curtiu sua publicação.', '/feed');
  end if;
  return NEW;
end $$;

drop trigger if exists feed_like_notification on public.feed_likes;
create trigger feed_like_notification after insert on public.feed_likes
for each row execute function public.notify_feed_like();

create or replace function public.notify_feed_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.feed_posts where id=NEW.post_id;
  if owner_id is not null and owner_id <> NEW.user_id then
    insert into public.notifications(user_id,actor_id,type,title,body,href)
    values(owner_id,NEW.user_id,'comment','Novo comentário','Você recebeu um novo comentário pendente.', '/feed');
  end if;
  return NEW;
end $$;

drop trigger if exists feed_comment_notification on public.feed_comments;
create trigger feed_comment_notification after insert on public.feed_comments
for each row execute function public.notify_feed_comment();

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,actor_id,type,title,body,href)
  values(NEW.following_id,NEW.follower_id,'follow','Novo seguidor','Alguém começou a seguir você.', '/feed');
  return NEW;
end $$;

drop trigger if exists user_follow_notification on public.user_follows;
create trigger user_follow_notification after insert on public.user_follows
for each row execute function public.notify_follow();
