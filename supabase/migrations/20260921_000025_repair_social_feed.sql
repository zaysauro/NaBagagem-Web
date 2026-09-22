-- NaBagagem: repair social/feed schema in an existing Supabase project.
-- Apply this migration in Supabase SQL Editor if previous migrations were not executed there.

create extension if not exists pgcrypto;

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  title text not null,
  body text,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
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
  unique(post_id,user_id)
);

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image',
  created_at timestamptz not null default now()
);

create table if not exists public.feed_bookmarks (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_user_idx on public.feed_posts(user_id,created_at desc);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id,created_at);
create index if not exists feed_bookmarks_user_idx on public.feed_bookmarks(user_id,created_at desc);
create index if not exists feed_bookmarks_post_idx on public.feed_bookmarks(post_id);
create index if not exists feed_post_media_post_idx on public.feed_post_media(post_id);

alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reports enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_bookmarks enable row level security;

drop policy if exists "feed_posts_select_public" on public.feed_posts;
create policy "feed_posts_select_public" on public.feed_posts for select to authenticated
using (visibility='public' or user_id=auth.uid());

drop policy if exists "feed_posts_owner_insert" on public.feed_posts;
create policy "feed_posts_owner_insert" on public.feed_posts for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_posts_owner_update" on public.feed_posts;
create policy "feed_posts_owner_update" on public.feed_posts for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "feed_posts_owner_delete" on public.feed_posts;
create policy "feed_posts_owner_delete" on public.feed_posts for delete to authenticated
using (user_id=auth.uid());

drop policy if exists "feed_likes_select" on public.feed_likes;
create policy "feed_likes_select" on public.feed_likes for select to authenticated
using (exists (select 1 from public.feed_posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid())));

drop policy if exists "feed_likes_owner_insert" on public.feed_likes;
create policy "feed_likes_owner_insert" on public.feed_likes for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_likes_owner_delete" on public.feed_likes;
create policy "feed_likes_owner_delete" on public.feed_likes for delete to authenticated
using (user_id=auth.uid());

drop policy if exists "feed_comments_select" on public.feed_comments;
create policy "feed_comments_select" on public.feed_comments for select to authenticated
using (approved=true or user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_comments_insert" on public.feed_comments;
create policy "feed_comments_insert" on public.feed_comments for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_comments_owner_update" on public.feed_comments;
create policy "feed_comments_owner_update" on public.feed_comments for update to authenticated
using (user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_comments_owner_delete" on public.feed_comments;
create policy "feed_comments_owner_delete" on public.feed_comments for delete to authenticated
using (user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_reports_insert" on public.feed_reports;
create policy "feed_reports_insert" on public.feed_reports for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_bookmarks_select_own" on public.feed_bookmarks;
create policy "feed_bookmarks_select_own" on public.feed_bookmarks for select to authenticated
using (user_id=auth.uid());

drop policy if exists "feed_bookmarks_insert_own" on public.feed_bookmarks;
create policy "feed_bookmarks_insert_own" on public.feed_bookmarks for insert to authenticated
with check (user_id=auth.uid());

drop policy if exists "feed_bookmarks_delete_own" on public.feed_bookmarks;
create policy "feed_bookmarks_delete_own" on public.feed_bookmarks for delete to authenticated
using (user_id=auth.uid());

drop policy if exists "feed_media_select" on public.feed_post_media;
create policy "feed_media_select" on public.feed_post_media for select to authenticated
using (exists (select 1 from public.feed_posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid())));

drop policy if exists "feed_media_insert" on public.feed_post_media;
create policy "feed_media_insert" on public.feed_post_media for insert to authenticated
with check (exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_media_delete" on public.feed_post_media;
create policy "feed_media_delete" on public.feed_post_media for delete to authenticated
using (exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

create or replace function public.feed_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists feed_posts_updated_at on public.feed_posts;
create trigger feed_posts_updated_at
before update on public.feed_posts
for each row execute function public.feed_posts_updated_at();

-- Realtime entries are intentionally guarded because the publication may already contain these tables.
do $$
begin
  begin alter publication supabase_realtime add table public.feed_posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_likes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.feed_bookmarks; exception when duplicate_object then null; end;
end $$;
