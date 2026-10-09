# NaBagagem — entrega parcial verificada em 09/10/2026

## Resultado executivo

Implementação na branch `neon-migration-foundation`, preservando os fluxos de login/cadastro que já usavam o handler oficial Neon Auth, a identidade visual e o aplicativo Swift. Foram adicionadas três migrations nativas com 29 tabelas de negócio, autorização PostgreSQL, funcionalidades ligadas à persistência e testes executáveis. **A plataforma ainda não está pronta para produção.**

O principal bloqueio continua externo: não há ferramenta Neon conectada nesta sessão e o Preview Vercel está sem conexão PostgreSQL e credenciais de Object Storage. Nenhuma migration foi aplicada no Neon, nenhum dado real foi apagado, nenhuma variável de produção foi alterada e não houve merge na main.

## Matriz de funcionalidades

| Funcionalidade | Status | Evidência | Pendência |
|---|---|---|---|
| Schema PostgreSQL nativo | IMPLEMENTADA E VALIDADA (local) | 001/002/003 executadas em PGlite com Auth ID text e UUID | Aplicar pelo plugin em branch Neon verificada |
| Dashboard com persistência Neon | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Queries reais + cards de próximas viagens, tarefas e gastos; viagens compartilhadas incluídas | Banco no Preview e teste autenticado |
| Cadastro/login/sessão | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Handler oficial existente preservado; wrappers legados corrigidos | Criar conta e entrar no ambiente isolado |
| Logout e senha | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | signOut, requestPasswordReset, resetPassword, changePassword conforme SDK instalado | Provedor de e-mail, origem Auth, sessões reais |
| Perfil/nome/username/bio | PARCIALMENTE IMPLEMENTADA | CRUD existente ligado ao schema e unicidade de username case-insensitive | Upload de avatar, país de residência na UI e E2E |
| Preferências/exportação | PARCIALMENTE IMPLEMENTADA | API/UI para locale/moeda/moderação; download JSON de dados próprios | Exportação integral de todos os recursos/mídia e teste autenticado |
| Exclusão de conta | NÃO IMPLEMENTADA | Nenhuma exclusão de usuário Auth adicionada | Fluxo oficial, revogação e limpeza completa de objetos |
| CRUD/status/arquivamento de viagens | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Formulário, confirmação de exclusão, status e API existente | E2E com conta real |
| Duplicar roteiro | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Transação; remapeamento explícito de locations; autoria; exclui reservas, despesas e arquivos | Teste HTTP autenticado e UX para copiar roteiro público por ID |
| Roteiro diário e mapa | PARCIALMENTE IMPLEMENTADA | UI existente preservada; integridade event/location testada | Completar novos campos de atividade/custo/duração na UI e testes de geocodificação |
| Passaporte | PARCIALMENTE IMPLEMENTADA | 195 códigos ISO testados; nomes pt/en/ja; correção TopoJSON → GeoJSON | Data/notas/vínculo na UI; estatísticas de continentes e validação de todos os marcadores |
| Bagagem | PARCIALMENTE IMPLEMENTADA | Múltiplas listas, itens, quantidade, três status, progresso, filtro, duplicação e exclusão | Edição completa, responsáveis e interface de modelos reutilizáveis |
| Checklist | PARCIALMENTE IMPLEMENTADA | CRUD/progresso existente; categoria compatível; schema de prazo/prioridade/responsável | Filtros e campos avançados na interface |
| Financeiro/câmbio | PARCIALMENTE IMPLEMENTADA | NUMERIC; valores decimais preservados na escrita; serviço real de câmbio corrigido para zero | Persistir taxa/data por despesa e testes externos completos |
| Fotos privadas | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | API/UI; compressão no dispositivo; validação MIME/assinatura; autorização e URL assinada | Bucket/credenciais; envio e leitura reais; miniaturas derivadas e metadados completos |
| Documentos privados | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | API/UI; PDFs/imagens; controle por participante e URLs temporárias | Bucket/credenciais; categorias/descrição na UI e testes reais |
| Limpeza de storage | PARCIALMENTE IMPLEMENTADA | Outbox sobre cascatas testada; tentativa de limpeza no servidor | Worker periódico para retries garantidos e reconciliação de uploads interrompidos |
| Feed/curtidas/seguidores | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Schema/rotas existentes integrados; RLS e bloqueios testados | E2E entre contas reais |
| Moderação | IMPLEMENTADA E VALIDADA (SQL) | Pendente/aprovado/oculto; não permite autoaprovação; botão de autor corrigido | Teste UI entre contas e antiabuso externo |
| Explorar/favoritos | PARCIALMENTE IMPLEMENTADA | Rotas existentes preservadas; cópia por token funcional no código | Roteiros salvos/modelos possuem schema, sem fluxo completo |
| Colaboração e convites | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Owner/editor/viewer; convites 7 dias, e-mail verificado, hash e consumo único testados | Validação no Auth real; lista/revogação de convites; envio de e-mail não implementado |
| Notificações/histórico | PARCIALMENTE IMPLEMENTADA | Triggers sociais com dedupe; histórico de roteiro/destinos/despesas; polling real | Eventos de convite/tarefas/alterações compartilhadas completos; sem push |
| Internacionalização | PARCIALMENTE IMPLEMENTADA | Dicionários pt-BR/en/ja, navegação e preferências; preferência persistida | Traduzir telas legadas e localizar todos os números/datas |
| Responsividade/PWA | PARCIALMENTE IMPLEMENTADA | Novas seções responsivas; manifest existente; cache restrito; login inspecionado em 390px | E2E mobile autenticado, ícones raster instaláveis e revisão completa de acessibilidade |
| Segurança | PARCIALMENTE IMPLEMENTADA | RLS para todas as tabelas, queries parametrizadas, owner imutável, CSRF, limite persistente social, arquivos privados | Auditoria dinâmica de todas as APIs e limites de abuso de provedores externos |
| Migração de dados Supabase | BLOQUEADA | Runtime sem SDK Supabase; migrations antigas preservadas | Inspecionar dados antigos pela integração antes de planejar transferência |
| Neon remoto/Auth/Storage | BLOQUEADA | Descoberta de ferramentas e catálogo: Neon não conectado | Conectar plugin e verificar projeto/branch/endpoint/bucket |
| Preview Vercel | IMPLEMENTADA, AGUARDANDO VALIDAÇÃO | Projeto e branch conferidos via plugin | Resultado do novo deploy registrado no relatório final da execução |

## Testes

- `npm run test`: **5 testes aprovados**. Dois cenários completos de schema/RLS (text e UUID), normalização dos 195 países, validação de upload e compatibilidade das projeções/escritas literais existentes com as colunas reais.
- Asserts de segurança cobrem: usuário alheio sem acesso privado; viewer sem escrita; editor sem escalonamento ou publicação; comentários não aprovados ocultos; bloqueios; documentos/malas privados; localização de outra viagem recusada; valores negativos recusados; convites expirados, reutilizados, de outro e-mail ou sem e-mail verificado recusados; limite de 30 escritas sociais; cascata de mala e fila de limpeza de arquivos isolada.
- `npm run typecheck`: **aprovado**.
- `npm run lint`: **0 erros e 34 warnings** (principalmente imagens, hooks e navegação legados; não foram ocultados).
- `npm run build`: **aprovado**. Os avisos de renderização dinâmica do SDK no build inicial não representaram falha; configuração ausente agora não usa sessão com segredo placeholder.
- `node scripts/smoke-api.mjs`: **16 verificações HTTP aprovadas** no build local: 9 rotas protegidas retornam 401/no-store; 5 páginas públicas retornam 200; CSRF retorna 403; dashboard sem sessão redireciona ao login.
- Navegador local: login renderizado em desktop e viewport 390×844; sem executar login no navegador do Mac.
- **Não testados em infraestrutura real:** os 26 fluxos autenticados completos, e-mail de recuperação, upload/download/exclusão remota, sessão após logout/login, câmbio/mapas sob falhas do provedor. Não foram usados mocks para declarar esses fluxos concluídos.

Falhas detectadas e corrigidas durante o trabalho: política RLS bloqueava RETURNING de viagem nova; fixture UUID com parâmetros de tipos incompatíveis; cache npm fora do diretório permitido (resolvido com cache local, sem mudar sistema); tipos de metadata no dashboard. Nenhuma falha de teste conhecida permanece no conjunto executado.

## Infraestrutura e riscos

A infraestrutura esperada e a sequência de aplicação estão em `neon-rollout.md`. A conexão exige `NEON_DATABASE_HOST` além de POSTGRES_URL para impedir apontar por engano à integração antiga. O runtime usa papel restrito dentro de cada transação e retorna conexões ao pool após commit/rollback.

A camada de queries compatível ainda existe como ponte para as telas antigas; sua segurança depende do papel/RLS reais, não de uma imitação do Supabase. Não há realtime Neon presumido: o cliente consulta APIs protegidas a cada 30 segundos. O schema não foi avaliado contra um banco de negócio parcialmente populado — aplicação remota exige inspeção prévia.

Há dependências legadas fixadas como `latest` no manifest, embora o lockfile preserve a resolução desta execução. O lint tem avisos e partes da UI continuam com tipagem ampla. A fila de limpeza requer um worker para recuperação automática de indisponibilidades prolongadas. Uploads em Functions limitam o arquivo a 4 MB; fotos da viagem são comprimidas no cliente.

**Status READY da plataforma: NÃO.** Um eventual READY do Vercel significa que o artefato compilou e foi servido; não significa que banco, Auth, storage ou todos os critérios de aceite foram validados.

## Próximos passos necessários

1. Disponibilizar a integração Neon para esta sessão e verificar a branch de desenvolvimento.
2. Aplicar migrations e configurar Preview com Auth/DB/Storage da mesma branch, sem modificar produção.
3. Executar os 26 fluxos com duas contas e registrar persistência e negativas de autorização.
4. Finalizar funcionalidades marcadas como parciais/não implementadas.
5. Somente após aceites completos solicitar autorização explícita de produção; não fazer merge automático.

## Commits de implementação

- `8564406` — feat(platform): integrate packing private files invitations and travel workflows
- `da5c454` — feat(db): add native Neon schema and enforce transactional RLS

## Arquivos alterados

```text
.env.example
.gitignore
app/api/auth/forgot-password/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/signup/route.ts
app/api/currency/route.ts
app/api/feed/[id]/route.ts
app/api/feed/route.ts
app/api/feed/upload/route.ts
app/api/invitations/accept/route.ts
app/api/media/[id]/route.ts
app/api/profile/export/route.ts
app/api/profile/preferences/route.ts
app/api/profile/stats/route.ts
app/api/profile/visited-countries/route.ts
app/api/social/profile/route.ts
app/api/trips/[id]/expenses/route.ts
app/api/trips/[id]/files/route.ts
app/api/trips/[id]/invitations/route.ts
app/api/trips/[id]/packing/route.ts
app/api/trips/[id]/route.ts
app/api/trips/copy/route.ts
app/api/trips/route.ts
app/auth/callback/route.ts
app/cadastro/signup-form.tsx
app/compartilhar/[token]/page.tsx
app/components/site-header.tsx
app/convite/page.tsx
app/dashboard/configuracoes/account-preferences.tsx
app/dashboard/configuracoes/page.tsx
app/dashboard/dashboard-overview.tsx
app/dashboard/page.tsx
app/dashboard/perfil/visited-countries.tsx
app/dashboard/perfil/world-map.tsx
app/dashboard/trips/[id]/page.tsx
app/dashboard/trips/[id]/trip-detail-client.tsx
app/dashboard/trips/[id]/trip-files.tsx
app/dashboard/trips/[id]/trip-lifecycle.tsx
app/dashboard/trips/[id]/trip-packing.tsx
app/feed/page.tsx
app/login/login-form.tsx
app/login/page.tsx
app/redefinir-senha/page.tsx
db/migrations/001_neon_schema.sql
db/migrations/002_authorization.sql
db/migrations/003_integrity_and_services.sql
eslint.config.mjs
lib/countries.ts
lib/i18n/dictionaries.ts
lib/neon/auth.ts
lib/neon/db.ts
lib/neon/file-validation.ts
lib/neon/storage-cleanup.ts
lib/neon/storage.ts
lib/neon/supabase-compat.ts
lib/offline-trip-cache.ts
lib/prepare-photo.ts
lib/supabase/client.ts
lib/supabase/server.ts
package-lock.json
package.json
proxy.ts
public/sw.js
scripts/migrate.mjs
scripts/smoke-api.mjs
tests/database.test.mjs
tests/domain.test.mjs
tests/schema-contract.test.mjs
docs/neon-rollout.md
docs/delivery-status.md
```
