-- NaBagagem V2: final feed schema repair
-- Safe to run more than once in Supabase SQL Editor.
-- Repairs installations where earlier social-feed migrations were skipped.

create extension if not exists pgcrypto;

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  title text not null,
  body text,
  visibility text not null default 'public'
    check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text,
  media_type text not null default 'image',
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_posts_created_idx
  on public.feed_posts(created_at desc);
create index if not exists feed_posts_user_idx
  on public.feed_posts(user_id, created_at desc);
create index if not exists feed_comments_post_idx
  on public.feed_comments(post_id, created_at);
create index if not exists feed_post_media_post_idx
  on public.feed_post_media(post_id);
create index if not exists feed_bookmarks_user_idx
  on public.feed_bookmarks(user_id, created_at desc);

-- Columns required by the current photo-upload API.
alter table public.feed_post_media
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists public_url text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists width integer,
  add column if not exists height integer;

-- Make PostgREST able to resolve profiles(...) in the feed query.
do $$
begin
  if to_regclass('public.profiles') is not null then
    if not exists (
      select 1 from pg_constraint
      where conname = 'feed_posts_user_profile_fkey'
        and conrelid = 'public.feed_posts'::regclass
    ) then
      alter table public.feed_posts
        add constraint feed_posts_user_profile_fkey
        foreign key (user_id) references public.profiles(id) on delete cascade;
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = 'feed_comments_user_profile_fkey'
        and conrelid = 'public.feed_comments'::regclass
    ) then
      alter table public.feed_comments
        add constraint feed_comments_user_profile_fkey
        foreign key (user_id) references public.profiles(id) on delete cascade;
    end if;
  end if;
end $$;

alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reports enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_bookmarks enable row level security;

-- Feed visibility follows the application's public/followers/private model.
create or replace function public.can_view_feed_post(
  p_post_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feed_posts p
    where p.id = p_post_id
      and (
        p.user_id = p_user_id
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and exists (
            select 1 from public.user_follows f
            where f.follower_id = p_user_id
              and f.following_id = p.user_id
          )
        )
      )
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = p_user_id and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = p_user_id)
      )
  );
$$;

drop policy if exists feed_posts_select on public.feed_posts;
create policy feed_posts_select on public.feed_posts
for select to authenticated
using (public.can_view_feed_post(id, auth.uid()));

drop policy if exists feed_posts_insert on public.feed_posts;
create policy feed_posts_insert on public.feed_posts
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists feed_posts_update on public.feed_posts;
create policy feed_posts_update on public.feed_posts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists feed_posts_delete on public.feed_posts;
create policy feed_posts_delete on public.feed_posts
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists feed_likes_select on public.feed_likes;
create policy feed_likes_select on public.feed_likes
for select to authenticated
using (public.can_view_feed_post(post_id, auth.uid()));

drop policy if exists feed_likes_insert on public.feed_likes;
create policy feed_likes_insert on public.feed_likes
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));

drop policy if exists feed_likes_delete on public.feed_likes;
create policy feed_likes_delete on public.feed_likes
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists feed_comments_select on public.feed_comments;
create policy feed_comments_select on public.feed_comments
for select to authenticated
using (
  public.can_view_feed_post(post_id, auth.uid())
  and (
    approved = true
    or user_id = auth.uid()
    or exists (
      select 1 from public.feed_posts p
      where p.id = post_id and p.user_id = auth.uid()
    )
  )
);

drop policy if exists feed_comments_insert on public.feed_comments;
create policy feed_comments_insert on public.feed_comments
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));

drop policy if exists feed_comments_update on public.feed_comments;
create policy feed_comments_update on public.feed_comments
for update to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
);

drop policy if exists feed_comments_delete on public.feed_comments;
create policy feed_comments_delete on public.feed_comments
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.feed_posts p where p.id = post_id and p.user_id = auth.uid())
);

drop policy if exists feed_reports_insert on public.feed_reports;
create policy feed_reports_insert on public.feed_reports
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists feed_reports_select_own on public.feed_reports;
create policy feed_reports_select_own on public.feed_reports
for select to authenticated
using (user_id = auth.uid());

drop policy if exists feed_media_select on public.feed_post_media;
create policy feed_media_select on public.feed_post_media
for select to authenticated
using (public.can_view_feed_post(post_id, auth.uid()));

drop policy if exists feed_media_insert on public.feed_post_media;
create policy feed_media_insert on public.feed_post_media
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.feed_posts p
    where p.id = post_id and p.user_id = auth.uid()
  )
);

drop policy if exists feed_media_delete on public.feed_post_media;
create policy feed_media_delete on public.feed_post_media
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists feed_bookmarks_select on public.feed_bookmarks;
create policy feed_bookmarks_select on public.feed_bookmarks
for select to authenticated
using (user_id = auth.uid());

drop policy if exists feed_bookmarks_insert on public.feed_bookmarks;
create policy feed_bookmarks_insert on public.feed_bookmarks
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_feed_post(post_id, auth.uid()));

drop policy if exists feed_bookmarks_delete on public.feed_bookmarks;
create policy feed_bookmarks_delete on public.feed_bookmarks
for delete to authenticated
using (user_id = auth.uid());

-- Keep updated_at current.
create or replace function public.feed_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feed_posts_updated_at on public.feed_posts;
create trigger feed_posts_updated_at
before update on public.feed_posts
for each row execute function public.feed_posts_updated_at();

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';
