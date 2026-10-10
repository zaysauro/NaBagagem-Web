# Landing e cadastro — 09/10/2026

## Implementação

- Landing reconstruída com fotografias locais otimizadas por Next Image, paleta verde/areia, tipografia editorial, apresentação dos recursos e exemplo explícito de roteiro.
- Layout responsivo inspecionado em desktop e 390×844. Âncora de navegação e cadastro verificados no navegador, sem login nem criação de conta.
- Login e cadastro com estrutura visual comum e campos acessíveis.
- Cadastro exige 8–128 caracteres na senha, nome e e-mail válidos; validação também na rota oficial. Senhas não são normalizadas.
- Mensagens em português distinguem credenciais incorretas, origem não autorizada, conta existente, e-mail não confirmado e indisponibilidade.
- Registro de falhas do handler contém apenas operação, status HTTP e código; nenhuma credencial ou corpo de resposta é registrado.

## Diagnóstico reproduzido

O Preview `nabagagemweb-32hjmgvpr-bruno-02a0.vercel.app` e o alias fixo `nabagagemweb-git-neon-migration-foundation-bruno-02a0.vercel.app` retornaram **403 / INVALID_ORIGIN** no endpoint Neon `/api/auth/sign-up/email`, com Origin igual ao endereço acessado. As requisições de diagnóstico usaram somente dados de validação inválidos, sem criação de conta.

O domínio principal `nabagagemweb.vercel.app` retornou 404 para essa rota. A main ainda usa o formulário/endpoint de cadastro Supabase anterior. Portanto, a mensagem do usuário “invalid login” não foi atribuída conclusivamente ao mesmo erro sem a URL usada por ele.

A correção externa necessária no Preview é autorizar o alias exato da branch na configuração de trusted origins do Neon Auth, mantendo Auth/DB/Storage coerentes. Não substituir Origin no proxy, não adicionar wildcard geral e não desativar a proteção. Não há ferramenta Neon conectada nesta sessão; essa configuração não foi alterada.

## Validação

- Build e typecheck aprovados.
- 8 testes aprovados.
- 21 verificações HTTP de acesso público/isolamento sem sessão aprovadas localmente.
- 3 verificações de rejeição de cadastro inválido aprovadas, sem criar contas.
- Lint: 0 erros, 34 avisos existentes.
- Cadastro autenticado real permanece bloqueado pela configuração de origem; nenhuma conclusão de funcionamento integral.

Mudanças somente na branch `neon-migration-foundation` e no PR em rascunho. Produção não alterada.
