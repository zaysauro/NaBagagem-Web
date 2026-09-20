create or replace function public.notify_trip_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trip_title text;
  owner_id uuid;
  enabled boolean := true;
begin
  select title, user_id into trip_title, owner_id from public.trips where id = new.trip_id;
  select coalesce(system_notifications, true) into enabled
  from public.notification_preferences
  where user_id = new.user_id;

  if enabled then
    insert into public.notifications(user_id, actor_id, type, title, body, href)
    values (
      new.user_id,
      owner_id,
      'system',
      'Você foi adicionado a uma viagem',
      coalesce(trip_title, 'Uma viagem') || ' agora está disponível no seu NaBagagem.',
      '/dashboard/trips/' || new.trip_id
    );
  end if;
  return new;
end;
$$;
