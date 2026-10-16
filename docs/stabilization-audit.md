# Auditoria de estabilização — atualização em 16/10/2026

Base analisada: main 3250353; produção de03cc6 (neon-migration-foundation). Nenhuma alteração remota de banco executada.

## Inventário inicial

| Recurso | Estado | Evidência / validação pendente |
|---|---|---|
| Domínio HTTPS | Funcional | HEAD 200; domínio verificado no projeto nabagagemweb |
| Landing e páginas públicas | Não testado | HTML servido; inspeção visual e responsividade pendentes |
| Cadastro, confirmação, login, logout e recuperação | Não testado | Neon Auth implementado; sem jornada autenticada comprovada |
| Migração histórica | Não testado | Não há backup ou transferência verificados; Supabase conectado lista somente MeuCaixa e CADENA |
| Banco Neon | Parcialmente funcional | Schema/RLS e adapter no código; conexão remota não validada |
| Países e mapa | Quebrado | Lista incompleta de coordenadas; microestados ausentes do atlas; mutações não atualizam pai |
| Feed | Quebrado | Ordena amostra de até 100 registros e depois pagina; posts antigos inacessíveis |
| Fotografias | Parcialmente funcional | Storage privado e validação implementados; variáveis AWS exigidas não configuradas; limite sujeito a concorrência |
| Viagens, destinos, roteiros, atividades | Não testado | CRUD e RLS presentes; testar com duas contas |
| Despesas | Parcialmente funcional | Inclusão/exclusão; falta edição no endpoint |
| Perfil, seguidores, comentários, likes, bloqueios, favoritos | Não testado | APIs presentes; testes SQL existentes não substituem E2E |
| Descoberta e viagens públicas | Não testado | Dependem do banco e regras de privacidade |
| Acessibilidade e mobile | Não testado | Revisão em 320/375/390/430/tablet/desktop pendente |
| Dependências | Parcialmente funcional | Lockfile existe na branch Neon, manifest usa latest; npm ci apresenta conflito de peers |

## Dependências e arquitetura

main: usuários auth.users, sessões e cookies @supabase/ssr, dados PostgREST, Storage feed-media, RLS auth.uid(), subscriptions Realtime no cliente. As migrations Supabase antigas permanecem intactas.

Produção: Neon Auth gerenciado; cookies pelo SDK Next; users neon_auth.user. Dados via pg com SET LOCAL ROLE nabagagem_app e identidade por transação. Adapter de queries mantém interface antiga, sem SDK Supabase. Storage files-sdk/neon exige bucket privado e credenciais AWS. Realtime substituído por polling. Não copiar senhas ou recriar usuários: transferência exige identidade/mapeamento validados e backup.

Prioridade: corrigir regressões locais (mapa, paginação, entradas), estabilizar dependências e testes; validar infraestrutura isolada antes de qualquer corte.

## Rotas e componentes inventariados

- `app/api/auth/[...path]/route.ts` (25 linhas)
- `app/api/auth/forgot-password/route.ts` (24 linhas)
- `app/api/auth/login/route.ts` (26 linhas)
- `app/api/auth/logout/route.ts` (8 linhas)
- `app/api/auth/signup/route.ts` (36 linhas)
- `app/api/currency/route.ts` (30 linhas)
- `app/api/discover/route.ts` (45 linhas)
- `app/api/feed/[id]/route.ts` (97 linhas)
- `app/api/feed/bookmarks/route.ts` (16 linhas)
- `app/api/feed/comments/route.ts` (37 linhas)
- `app/api/feed/route.ts` (73 linhas)
- `app/api/feed/upload/route.ts` (49 linhas)
- `app/api/geocode/route.ts` (50 linhas)
- `app/api/invitations/accept/route.ts` (10 linhas)
- `app/api/media/[id]/route.ts` (14 linhas)
- `app/api/notifications/preferences/route.ts` (46 linhas)
- `app/api/notifications/route.ts` (40 linhas)
- `app/api/notifications/sync/route.ts` (226 linhas)
- `app/api/notifications/weather-sync/route.ts` (243 linhas)
- `app/api/places/route.ts` (49 linhas)
- `app/api/profile/export/route.ts` (16 linhas)
- `app/api/profile/interests/route.ts` (34 linhas)
- `app/api/profile/preferences/route.ts` (6 linhas)
- `app/api/profile/privacy/route.ts` (13 linhas)
- `app/api/profile/route.ts` (42 linhas)
- `app/api/profile/stats/route.ts` (100 linhas)
- `app/api/profile/visited-countries/route.ts` (78 linhas)
- `app/api/route/route.ts` (45 linhas)
- `app/api/search/route.ts` (129 linhas)
- `app/api/social/block/route.ts` (23 linhas)
- `app/api/social/connections/route.ts` (27 linhas)
- `app/api/social/follow/route.ts` (22 linhas)
- `app/api/social/profile/route.ts` (54 linhas)
- `app/api/trips/[id]/checklist/route.ts` (8 linhas)
- `app/api/trips/[id]/events/route.ts` (89 linhas)
- `app/api/trips/[id]/expenses/route.ts` (15 linhas)
- `app/api/trips/[id]/export/route.ts` (76 linhas)
- `app/api/trips/[id]/files/route.ts` (51 linhas)
- `app/api/trips/[id]/invitations/route.ts` (14 linhas)
- `app/api/trips/[id]/locations/route.ts` (59 linhas)
- `app/api/trips/[id]/members/route.ts` (93 linhas)
- `app/api/trips/[id]/optimize/route.ts` (91 linhas)
- `app/api/trips/[id]/packing/route.ts` (91 linhas)
- `app/api/trips/[id]/route.ts` (92 linhas)
- `app/api/trips/[id]/share/route.ts` (15 linhas)
- `app/api/trips/copy/route.ts` (26 linhas)
- `app/api/trips/import/route.ts` (81 linhas)
- `app/api/trips/route.ts` (59 linhas)
- `app/api/weather/route.ts` (31 linhas)
- `app/auth/callback/route.ts` (5 linhas)
- `app/buscar/page.tsx` (213 linhas)
- `app/buscar/search-user-result.tsx` (86 linhas)
- `app/cadastro/page.tsx` (3 linhas)
- `app/cadastro/signup-form.tsx` (145 linhas)
- `app/compartilhar/[token]/page.tsx` (20 linhas)
- `app/components/auth-shell.module.css` (1 linhas)
- `app/components/auth-shell.tsx` (8 linhas)
- `app/components/pwa-install.tsx` (31 linhas)
- `app/components/site-header.tsx` (52 linhas)
- `app/convite/page.tsx` (7 linhas)
- `app/dashboard/configuracoes/account-preferences.tsx` (12 linhas)
- `app/dashboard/configuracoes/notification-preferences.tsx` (108 linhas)
- `app/dashboard/configuracoes/page.tsx` (45 linhas)
- `app/dashboard/dashboard-overview.tsx` (13 linhas)
- `app/dashboard/feed-link.tsx` (5 linhas)
- `app/dashboard/notifications.tsx` (153 linhas)
- `app/dashboard/page.tsx` (89 linhas)
- `app/dashboard/perfil/editar/page.tsx` (19 linhas)
- `app/dashboard/perfil/page.tsx` (112 linhas)
- `app/dashboard/perfil/profile-interests.tsx` (24 linhas)
- `app/dashboard/perfil/stats-chart.tsx` (32 linhas)
- `app/dashboard/perfil/visited-countries.tsx` (92 linhas)
- `app/dashboard/perfil/world-map.tsx` (158 linhas)
- `app/dashboard/trips/[id]/page.tsx` (98 linhas)
- `app/dashboard/trips/[id]/trip-calendar.tsx` (37 linhas)
- `app/dashboard/trips/[id]/trip-collaboration.tsx` (87 linhas)
- `app/dashboard/trips/[id]/trip-currency.tsx` (38 linhas)
- `app/dashboard/trips/[id]/trip-detail-client.tsx` (120 linhas)
- `app/dashboard/trips/[id]/trip-files.tsx` (15 linhas)
- `app/dashboard/trips/[id]/trip-lifecycle.tsx` (11 linhas)
- `app/dashboard/trips/[id]/trip-map.tsx` (270 linhas)
- `app/dashboard/trips/[id]/trip-packing.tsx` (35 linhas)
- `app/dashboard/trips/[id]/trip-public-toggle.tsx` (9 linhas)
- `app/dashboard/trips/[id]/trip-qr.tsx` (18 linhas)
- `app/dashboard/trips/[id]/trip-reservations.tsx` (17 linhas)
- `app/dashboard/trips/[id]/trip-share-tools.tsx` (51 linhas)
- `app/dashboard/trips/[id]/trip-summary.tsx` (157 linhas)
- `app/dashboard/trips/[id]/trip-tools.tsx` (24 linhas)
- `app/dashboard/trips/[id]/trip-weather.tsx` (5 linhas)
- `app/dashboard/trips/new/page.tsx` (75 linhas)
- `app/descoberta/page.tsx` (29 linhas)
- `app/esqueci-senha/forgot-password-form.tsx` (44 linhas)
- `app/esqueci-senha/page.tsx` (16 linhas)
- `app/favoritos/page.tsx` (27 linhas)
- `app/feed/page.tsx` (312 linhas)
- `app/feed/travel-gallery.tsx` (13 linhas)
- `app/globals.css` (76 linhas)
- `app/landing.module.css` (6 linhas)
- `app/layout.tsx` (9 linhas)
- `app/login/login-form.tsx` (93 linhas)
- `app/login/page.tsx` (3 linhas)
- `app/page.tsx` (22 linhas)
- `app/perfil/[username]/page.tsx` (214 linhas)
- `app/perfil/[username]/profile-actions.tsx` (121 linhas)
- `app/redefinir-senha/page.tsx` (58 linhas)
- `app/robots.ts` (5 linhas)
- `app/sitemap.ts` (17 linhas)
- `app/viagem/[id]/page.tsx` (25 linhas)
- `app/viagem/shared-trip-actions.tsx` (20 linhas)
- `db/migrations/001_neon_schema.sql` (324 linhas)
- `db/migrations/002_authorization.sql` (268 linhas)
- `db/migrations/003_integrity_and_services.sql` (125 linhas)
- `lib/auth-feedback.ts` (24 linhas)
- `lib/checklist-validation.ts` (29 linhas)
- `lib/countries.ts` (13 linhas)
- `lib/i18n/dictionaries.ts` (9 linhas)
- `lib/neon/auth.ts` (34 linhas)
- `lib/neon/db.ts` (46 linhas)
- `lib/neon/file-validation.ts` (11 linhas)
- `lib/neon/storage-cleanup.ts` (5 linhas)
- `lib/neon/storage.ts` (21 linhas)
- `lib/neon/supabase-compat.ts` (317 linhas)
- `lib/offline-trip-cache.ts` (35 linhas)
- `lib/prepare-photo.ts` (15 linhas)
- `lib/supabase/client.ts` (57 linhas)
- `lib/supabase/server.ts` (5 linhas)
- `supabase/migrations/20260920_000001_initial_travel_schema.sql` (242 linhas)
- `supabase/migrations/20260920_000002_complete_platform_schema.sql` (565 linhas)
- `supabase/migrations/20260920_000002_map_coordinates.sql` (6 linhas)
- `supabase/migrations/20260920_000003_itinerary_enhancements.sql` (13 linhas)
- `supabase/migrations/20260920_000004_expenses_checklist.sql` (44 linhas)
- `supabase/migrations/20260920_000005_profile_stats.sql` (30 linhas)
- `supabase/migrations/20260920_000006_social_feed.sql` (101 linhas)
- `supabase/migrations/20260920_000007_social_expansion.sql` (123 linhas)
- `supabase/migrations/20260920_000008_trip_sharing.sql` (18 linhas)
- `supabase/migrations/20260920_000009_social_profile.sql` (20 linhas)
- `supabase/migrations/20260920_000010_social_feed_completion.sql` (153 linhas)
- `supabase/migrations/20260920_000011_travel_analytics.sql` (15 linhas)
- `supabase/migrations/20260920_000012_notifications.sql` (36 linhas)
- `supabase/migrations/20260920_000013_social_notifications.sql` (44 linhas)
- `supabase/migrations/20260920_000014_trip_reminders.sql` (13 linhas)
- `supabase/migrations/20260920_000015_event_reservations.sql` (9 linhas)
- `supabase/migrations/20260920_000016_notification_preferences.sql` (52 linhas)
- `supabase/migrations/20260920_000017_notification_preference_enforcement.sql` (104 linhas)
- `supabase/migrations/20260920_000018_trip_collaboration.sql` (193 linhas)
- `supabase/migrations/20260920_000019_trip_tools_collaboration.sql` (16 linhas)
- `supabase/migrations/20260920_000020_system_notification_preference.sql` (30 linhas)
- `supabase/migrations/20260920_000021_feed_bookmarks.sql` (34 linhas)
- `supabase/migrations/20260921_000023_trip_budget.sql` (6 linhas)
- `supabase/migrations/20260921_000024_social_notifications_and_blocks.sql` (93 linhas)
- `supabase/migrations/20260921_000025_repair_social_feed.sql` (164 linhas)
- `supabase/migrations/20260921_000026_search_profiles.sql` (14 linhas)
- `supabase/migrations/20260921_000027_repair_profiles_notifications.sql` (74 linhas)
- `supabase/migrations/20260921_000028_follow_system.sql` (29 linhas)
- `supabase/migrations/20260921_000029_search_users_by_email.sql` (43 linhas)
- `supabase/migrations/20260921_000030_repair_user_search.sql` (78 linhas)
- `supabase/migrations/20260921_000031_final_user_search_repair.sql` (123 linhas)
- `supabase/migrations/20260921_000032_final_follow_repair.sql` (45 linhas)
- `supabase/migrations/20260922_000033_map_photos_upgrade.sql` (41 linhas)
- `supabase/migrations/20260923_000034_final_feed_repair.sql` (293 linhas)
- `supabase/migrations/20260924_000035_feed_schema_hard_repair.sql` (158 linhas)
- `supabase/migrations/20260924_000036_repair_feed_bookmarks.sql` (156 linhas)
- `supabase/migrations/20260927210000_create_profile_interests.sql` (57 linhas)
- `supabase/migrations/20260927223000_create_profile_visited_countries.sql` (34 linhas)
- `supabase/migrations/20260927_000037_discovery_interests_public_profiles.sql` (58 linhas)
- `supabase/migrations/20260927_000038_public_social_indexing.sql` (18 linhas)
- `supabase/migrations/20260927_000039_public_profile_connections.sql` (9 linhas)
- `supabase/migrations/20260927_000040_public_trip_rls.sql` (17 linhas)
- `supabase/migrations/20260928_000041_feed_photo_publish_repair.sql` (191 linhas)
- `supabase/migrations/20260928_000042_feed_posts_rls_hard_reset.sql` (77 linhas)

## Correções implementadas nesta execução

- Pins independentes da geometria do atlas, coordenadas/ISO para os 195 países suportados, índice de nomes/aliases e atualização do perfil após mutações. Falha de carregamento não é apresentada como carregamento infinito.
- Feed: cursor composto por timestamp PostgreSQL (precisão de microssegundos preservada) + UUID, filtros SQL antes do limite, proteção contra respostas fora de ordem no cliente e deduplicação por ID.
- Upload: formatos coerentes com validador, falha de contagem tratada, capacidade serializada por post no banco, reserva durável de limpeza antes do upload e remoção transacional da reserva ao registrar mídia. A fila ainda exige execução periódica para garantir limpeza sem atividade do usuário.
- Despesas: PATCH com escopo de viagem e autorização, edição/cancelamento na interface, validação decimal/data/categoria/moeda e soma em centavos.
- Auth: inicialização lazy sem segredo fictício; indisponibilidade retorna erro; CSRF também cobre wrappers legados. O provedor gerenciado continua responsável por confirmação de e-mail, senha e sessão.
- Dependências diretas fixadas às versões do lockfile existente; Playwright adicionado com versão exata. Metadados SEO usam o domínio oficial. CI executa testes, lint, build, typecheck e navegador.

## Validação e limites

- 13 testes Node/PGlite passaram, incluindo schema/RLS com IDs text e UUID, países persistidos e isolados por usuário, capacidade de mídia, reservas privadas de limpeza, paginação de 137 posts com empates/microssegundos e inserção entre páginas.
- TypeScript passou; lint sem erros, 34 avisos legados.
- Build de produção e TypeScript passaram localmente e no CI para ee4d960b119aaeaf63a896bd8194eefb6564f7e7.
- 21 verificações HTTP sem sessão passaram localmente e no domínio oficial. Isso não comprova fluxos autenticados.
- Chromium local foi bloqueado pelo sandbox macOS. No CI Linux, os 8 testes Playwright passaram em 5,6 s: mapa com fixtures explícitas (9 → 10 → 9 e reload), CSRF de autenticação e páginas públicas em seis larguras. São testes da aplicação local no runner; não comprovam banco, armazenamento ou autenticação remotos.
- Inspeção do domínio no navegador: landing, login e cadastro sem overflow horizontal nas larguras 320, 375, 390, 430, 768 e 1440. Login/cadastro renderizados; nenhuma conta de produção criada.
- Domínio verificado na Vercel, HTTPS 200. Produção aponta a de03cc6 da branch neon-migration-foundation. main continua em 3250353. Nenhuma promoção ou alteração de branch de produção realizada.
- Nenhuma migration aplicada remotamente; nenhum usuário ou histórico excluído ou recriado. Backup, transferência e equivalência dos dados legados ainda NÃO verificados.

## Bloqueios concretos de lançamento

1. Instalar/conectar Neon e confirmar projeto polished-water-63648513, branch de origem e banco. Validar que as identificações históricas ainda estão corretas. Criar ambiente isolado antes de migrations.
2. Identificar o Supabase de origem. A conexão disponível lista MeuCaixa e CADENA; não inferir correspondência pelo nome. Obter backup consistente de auth/dados/metadados de mídia antes da transferência; preservar IDs ou manter mapeamento auditável; planejar revalidação de e-mail/reset de senha se hashes não forem compatíveis.
3. Configurar Preview com POSTGRES_URL e NEON_DATABASE_HOST da branch isolada. Em produção há variáveis PostgreSQL herdadas da integração anterior; o destino não foi confirmado nesta execução.
4. Configurar bucket privado e AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AWS_REGION; nenhuma dessas quatro variáveis aparece na listagem Vercel. Definir política de limpeza periódica das reservas vencidas/outbox.
5. Conferir origens Neon Auth para domínio oficial e preview; executar confirmação de e-mail e recuperação, persistência e expiração de sessão com contas de teste.
6. Aplicar 004 somente após backup e teste isolado, seguindo o runner com ledger. Não publicar o código de uploads desta branch sem a migration correspondente.
7. Validar jornadas autenticadas completas com duas contas (incluindo privacidade, bloqueios, fotos e viagens) e mobile. Upload de avatar, moderação completa, todas as telas e integrações externas ainda requerem validação.
8. Somente depois reconciliar main com a versão validada e promover o artefato. A autorização de publicação está no pedido do usuário, mas os critérios técnicos para corte ainda não foram satisfeitos.

### Validação adicional no navegador

A interface real foi servida em localhost:3017 e exercitada por um proxy de teste local em localhost:3018, com fixtures explícitas somente para as duas APIs do perfil. Confirmados no DOM: 9 pins iniciais; 10 após adicionar Fiji; 9 após excluir Fiji; 9 após reload. Contadores e lista acompanharam as alterações. Evidência visual salva em outputs/mapa-validacao-local.jpg. Isso valida integração React/HTTP no navegador, não banco ou autenticação remotos.

## Evidências de entrega — 16/10/2026

- [PR #2](https://github.com/zaysauro/NaBagagem-Web/pull/2), draft, de stabilization-launch para neon-migration-foundation. Não mesclado; main permanece sem alterações.
- [CI Quality #2](https://github.com/zaysauro/NaBagagem-Web/actions/runs/38826239297), commit ee4d960b119aaeaf63a896bd8194eefb6564f7e7: instalação, 13 testes Node, lint, build, typecheck e 8 testes de navegador concluídos com sucesso. Logs e etapas consultados, não apenas o status geral.
- [Preview Vercel](https://nabagagemweb-3uhsgr9mr-bruno-02a0.vercel.app), deployment dpl_9rwRhhroubQosUyCkqRzvcadf1vh: HTTPS 200 e 21 verificações HTTP do script scripts/smoke-api.mjs aprovadas em 16/10. Cobrem acesso sem sessão, páginas públicas e rejeição de mutação cross-origin; não cobrem operações autenticadas.
- Nenhuma promoção para produção. A migration 004 e as credenciais/serviços externos precisam ser validados no ambiente isolado antes da liberação.
