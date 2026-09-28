-- NaBagagem: hard reset da RLS de feed_posts.
-- Execute no Supabase SQL Editor. Pode ser executado mais de uma vez.

alter table public.feed_posts enable row level security;

-- Remove TODAS as políticas existentes de feed_posts, inclusive políticas
-- antigas com nomes diferentes das migrations atuais.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feed_posts'
  loop
    execute format(
      'drop policy if exists %I on public.feed_posts',
      policy_record.policyname
    );
  end loop;
end
$$;

-- Permissão SQL para o papel autenticado.
grant select, insert, update, delete
on public.feed_posts
to authenticated;

-- Leitura: o próprio usuário sempre pode ver seus posts;
-- posts públicos ficam disponíveis para usuários autenticados;
-- posts de seguidores ficam disponíveis para quem segue o autor.
create policy feed_posts_select
on public.feed_posts
for select
to authenticated
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1
      from public.user_follows f
      where f.follower_id = auth.uid()
        and f.following_id = feed_posts.user_id
    )
  )
);

-- Publicação: somente em nome do usuário autenticado.
create policy feed_posts_insert
on public.feed_posts
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

-- Edição: somente do próprio post.
create policy feed_posts_update
on public.feed_posts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Exclusão: somente do próprio post.
create policy feed_posts_delete
on public.feed_posts
for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
