-- Respect per-user notification preferences when creating social notifications.
create or replace function public.notify_feed_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  enabled boolean;
begin
  select user_id into owner_id
  from public.feed_posts
  where id = new.post_id;

  select coalesce(social_notifications, true)
  into enabled
  from public.notification_preferences
  where user_id = owner_id;

  if owner_id is not null
     and owner_id <> new.user_id
     and enabled then
    insert into public.notifications(user_id, actor_id, type, title, body, href)
    values (
      owner_id,
      new.user_id,
      'like',
      'Nova curtida',
      'Alguém curtiu sua publicação.',
      '/feed'
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  enabled boolean;
begin
  select user_id into owner_id
  from public.feed_posts
  where id = new.post_id;

  select coalesce(social_notifications, true)
  into enabled
  from public.notification_preferences
  where user_id = owner_id;

  if owner_id is not null
     and owner_id <> new.user_id
     and enabled then
    insert into public.notifications(user_id, actor_id, type, title, body, href)
    values (
      owner_id,
      new.user_id,
      'comment',
      'Novo comentário',
      'Você recebeu um novo comentário pendente.',
      '/feed'
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled boolean;
begin
  select coalesce(social_notifications, true)
  into enabled
  from public.notification_preferences
  where user_id = new.following_id;

  if enabled then
    insert into public.notifications(user_id, actor_id, type, title, body, href)
    values (
      new.following_id,
      new.follower_id,
      'follow',
      'Novo seguidor',
      'Alguém começou a seguir você.',
      '/feed'
    );
  end if;

  return new;
end;
$$;
