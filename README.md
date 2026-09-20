# NaBagagem Web

Plataforma web do **NaBagagem**, reconstruída a partir do aplicativo iOS original.

## Objetivo

Criar uma versão web completa e persistente do NaBagagem usando:

- Next.js + TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Storage e Realtime
- Vercel para deploy
- GitHub para versionamento

O aplicativo iOS original permanece intacto em [zaysauro/NaBagagem-App](https://github.com/zaysauro/NaBagagem-App).

## Módulos planejados

- Autenticação e perfil
- Dashboard
- Viagens
- Eventos dentro das viagens
- Mapa interativo
- Feed social
- Posts, fotos, curtidas, comentários e favoritos
- Busca
- Armazenamento de imagens
- Dados de países
- Configurações

## Desenvolvimento local

1. Copie `.env.example` para `.env.local`.
2. Preencha as credenciais do projeto Supabase.
3. Instale as dependências:

```bash
npm install
```

4. Rode:

```bash
npm run dev
```

## Arquitetura

O banco será criado com migrations SQL e Row Level Security. O frontend usa Supabase SSR para autenticação segura no App Router.

> Esta versão é uma reconstrução web do produto. O código Swift do aplicativo original é usado como referência funcional e visual, não como código a ser convertido literalmente.
