# NaBagagem — aplicação das migrations e validação

## Destino obrigatório

- Repositório: `zaysauro/NaBagagem-Web`; branch: `neon-migration-foundation`; PR: #1.
- Neon: `polished-water-63648513` (NasBagagens), origem `br-aged-haze-b4ujptch` (production), database `neondb`.
- Vercel: `prj_orWQ3sVYv9vHVQ6egFCSHSWrMWdK`, team `team_xeGj65wyh4O5Stp22r0actEX`.
- Não usar credenciais Supabase antigas nem aplicar SQL na produção por dedução de hostname.

## Estado verificado nesta execução

O plugin Neon não está conectado nas ferramentas da sessão. Nenhuma migration foi aplicada remotamente. O plugin Vercel confirma variáveis Auth em Preview, mas não confirma POSTGRES_URL nesse ambiente e não lista AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 ou AWS_REGION. POSTGRES_URL está somente em produção e associado à integração anterior. Não foi possível comparar seu destino com o projeto Neon. Valores secretos não foram exibidos nem copiados.

## Ordem de aplicação pelo plugin Neon

1. Inspecionar o projeto e a branch por ID. Confirmar database, região, endpoint, tipo de neon_auth.user.id, emailVerified, roles e tabelas existentes. Não alterar neon_auth.
2. Criar uma branch de desenvolvimento a partir da origem, sem escrever dados de teste na produção.
3. Aplicar as três migrations em uma transação, com advisory lock e ledger de nome/checksum. O runner `scripts/migrate.mjs` documenta esse protocolo; ele só aceita uma URL e host explicitamente verificados, não herda credenciais da aplicação. A execução remota permanece pelo plugin conforme a autorização do usuário.
4. Validar as policies usando `SET LOCAL ROLE nabagagem_app` e identidade de sessão definida com `set_config(...,true)`. Não validar isolamento como neondb_owner: o proprietário pode ignorar RLS.
5. Configurar somente Preview: POSTGRES_URL da branch de desenvolvimento, NEON_DATABASE_HOST igual ao endpoint verificado, Auth e credenciais de Storage correspondentes à mesma branch. Confirmar origem permitida no Neon Auth para o Preview. Provisionar uploads como privado.
6. Executar os 26 fluxos do documento de missão com contas de teste em ambiente isolado, inclusive logout/login, expiração de convites, moderação, concorrência e acesso cruzado a objetos.
7. Registrar evidências; somente então solicitar autorização para produção. Não fazer merge automático.

## Migrations

- `001_neon_schema.sql`: 29 tabelas funcionais, compatíveis com os nomes usados na aplicação. Detecta o tipo de `neon_auth.user.id`; aceita text, uuid e varchar sem assumir UUID. Preenche profiles com usuários já existentes, sem criar usuários Auth.
- `002_authorization.sql`: papel NOLOGIN/NOBYPASSRLS, RLS por tabela, regras owner/editor/viewer, privacidade social, bloqueios, identidade/parentesco imutáveis, bootstrap de profiles e moderação.
- `003_integrity_and_services.sql`: integridade de localização por viagem, índices únicos, valores monetários, RPCs, notificações reais, convites de uso único para e-mail verificado, limite persistente de escritas, fila de limpeza de arquivos, histórico e estados de moderação.

O ledger torna reaplicações no mesmo banco seguras: migrations com checksum correspondente são ignoradas, e mudanças em migrations já aplicadas são recusadas. 002/003 não são scripts para reaplicação manual avulsa. Nenhuma migration antiga Supabase deve ser executada no Neon. Nenhum dado legado foi extraído ou apagado.

## Equivalências de modelos

| Conceito da missão | Modelo usado |
|---|---|
| Dias e roteiro | trip_events.day_index/event_date; sem tabela trip_days duplicada |
| Checklist | trip_checklist_items; categoria, prazo, prioridade e responsável |
| Despesas/orçamento | trip_expenses + trips.budget_amount/budget_currency; NUMERIC |
| Posts/mídia/curtidas/comentários | feed_posts/feed_post_media/feed_likes/feed_comments |
| Seguidores | user_follows; user_blocks para bloqueios |
| Países/interesses | profile_visited_countries/profile_interests |
| Malas/itens | packing_lists/packing_items |
| Documentos/fotos | trip_documents/trip_photos; apenas metadados |
| Convites/histórico | trip_invitations/trip_activity |
| Modelos/roteiros salvos | trip_templates/saved_itineraries (schema; interface ainda pendente) |

## Garantias e limites

- Todas as consultas do runtime usam transação com papel restrito e identidade do Neon Auth; a adaptação de queries antiga continua temporariamente, mas não é tratada como RLS. Não há PostgreSQL no navegador.
- Só o proprietário publica a viagem; viewer não escreve; editor não altera ownership. Convite exige e-mail verificado e correspondência ao destinatário, expiração e consumo único.
- URLs de arquivos apontam a /api/media/:id, que autoriza antes de gerar URL assinada de 60 segundos. Documentos não são publicados no feed. Upload tem validação de assinatura/MIME e limite de 4 MB, compatível com envio via Function. Fotos da viagem são comprimidas no dispositivo para até 1600 px.
- Exclusões registram caminhos em outbox durável e tentam limpeza. Falhas ficam registradas; falta um worker agendado para garantir retries sem nova ação do usuário.
- Service worker armazena somente manifest/ícone. Cache de roteiro foi reduzido a sessionStorage por até uma hora e é limpo em logout/recusa de autorização. Não há sincronização offline completa.
- Notificações sociais são criadas em SQL com deduplicação. Atualizações no cliente usam polling de 30s, não uma assinatura Realtime simulada. Push não foi implementado.
- Referência do passaporte: 193 membros ONU + Santa Sé + Palestina = 195. Territórios dependentes ficam fora do denominador. ISO alpha-2 e Intl.DisplayNames normalizam nomes. Coordenadas de destinos continuam provenientes do usuário/geocodificação; marcadores de país são representações geográficas aproximadas.
- Idiomas pt-BR/en/ja cobrem navegação e preferências. Ainda há textos fixos nas telas legadas; não é internacionalização completa.
- Supabase histórico: ausência de acesso validado ao banco antigo impede afirmar que não há dados reais a migrar.

## Verificação reproduzível

```
npm ci
npm run test
npm run typecheck
npm run lint
npm run build
npm run start -- --port 3017
node scripts/smoke-api.mjs
```

Os testes PGlite executam PostgreSQL real em WASM com fixtures descartáveis. Eles não simulam o serviço Neon e não comprovam configuração, rede, Auth gerenciado, e-mail, storage ou persistência remota. Os testes HTTP sem sessão também não substituem E2E autenticado.
