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
  created_at timestamptz not null default now()
);

create table if not exists public.feed_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);

create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_user_idx on public.feed_posts(user_id,created_at desc);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id,created_at);
create index if not exists feed_reports_post_idx on public.feed_reports(post_id);

alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reports enable row level security;

drop policy if exists "feed_posts_select_public" on public.feed_posts;
create policy "feed_posts_select_public" on public.feed_posts
for select using (visibility='public' or user_id=auth.uid());

drop policy if exists "feed_posts_owner_insert" on public.feed_posts;
create policy "feed_posts_owner_insert" on public.feed_posts
for insert with check (user_id=auth.uid());

drop policy if exists "feed_posts_owner_update" on public.feed_posts;
create policy "feed_posts_owner_update" on public.feed_posts
for update using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "feed_posts_owner_delete" on public.feed_posts;
create policy "feed_posts_owner_delete" on public.feed_posts
for delete using (user_id=auth.uid());

drop policy if exists "feed_likes_select" on public.feed_likes;
create policy "feed_likes_select" on public.feed_likes
for select using (exists (select 1 from public.feed_posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid())));

drop policy if exists "feed_likes_owner_insert" on public.feed_likes;
create policy "feed_likes_owner_insert" on public.feed_likes
for insert with check (user_id=auth.uid());

drop policy if exists "feed_likes_owner_delete" on public.feed_likes;
create policy "feed_likes_owner_delete" on public.feed_likes
for delete using (user_id=auth.uid());

drop policy if exists "feed_comments_select" on public.feed_comments;
create policy "feed_comments_select" on public.feed_comments
for select using (approved=true or user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_comments_insert" on public.feed_comments;
create policy "feed_comments_insert" on public.feed_comments
for insert with check (user_id=auth.uid());

drop policy if exists "feed_comments_owner_update" on public.feed_comments;
create policy "feed_comments_owner_update" on public.feed_comments
for update using (user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_comments_owner_delete" on public.feed_comments;
create policy "feed_comments_owner_delete" on public.feed_comments
for delete using (user_id=auth.uid() or exists (select 1 from public.feed_posts p where p.id=post_id and p.user_id=auth.uid()));

drop policy if exists "feed_reports_insert" on public.feed_reports;
create policy "feed_reports_insert" on public.feed_reports
for insert with check (user_id=auth.uid());

create or replace function public.feed_posts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists feed_posts_updated_at on public.feed_posts;
create trigger feed_posts_updated_at before update on public.feed_posts
for each row execute function public.feed_posts_updated_at();
