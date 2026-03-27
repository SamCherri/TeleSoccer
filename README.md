# TeleSoccer Web

Web app mobile-first de futebol por turnos orientado por cenas visuais.

## Status atual

- ETAPA 1: auditoria concluída.
- ETAPA 2: fundação monorepo + API/WEB concluída.
- ETAPA 3: modelagem Prisma + PostgreSQL e persistência orientada a repositório **em validação**.

> Observação de escopo: skills internas foram entregues em trilha separada (`.codex/skills`) e não definem conclusão da ETAPA 3.

## Monorepo

- `apps/api` → backend Node.js + TypeScript + Fastify
- `apps/web` → frontend React + TypeScript + Vite

## ETAPA 3 — estado da persistência

### 1) Prisma + PostgreSQL

- Arquivo: `apps/api/prisma/schema.prisma`
- Entidades modeladas:
  - `User`
  - `Team`
  - `Player`
  - `Match`
  - `MatchTurn`
  - `MatchEvent`
  - `MatchLineup`
  - `MatchParticipantAction`

### 2) Arquitetura por camadas (backend)

- `src/domain`
  - `entities/match-aggregate.ts`
  - `repositories/match-repository.ts`
- `src/application`
  - `services/match-application-service.ts`
- `src/infra`
  - `prisma/prisma-client.ts`
  - `repositories/prisma-match-repository.ts`
  - `repositories/in-memory-match-repository.ts`
  - `repositories/create-match-repository.ts`
- `src/presentation`
  - rotas Fastify e bootstrap HTTP

### 3) Persistência orientada a repositório com fallback

- Com `DATABASE_URL`: usa `PrismaMatchRepository` (PostgreSQL).
- Sem `DATABASE_URL`: usa `InMemoryMatchRepository` temporário.
- Objetivo: transição gradual sem quebrar integração atual.

### 4) Correção de bloqueio de FK (players participantes)

No fluxo Prisma:

- `createMatch` agora cria Team **e Player mínimos coerentes** para participantes iniciais.
- O evento inicial é persistido com `primaryPlayerId` e `secondaryPlayerId` válidos.
- `persistTurn` resolve IDs de participantes por:
  1. `incomingId` válido dentro do time;
  2. fallback por `displayName + teamId`;
  3. `null` quando não houver jogador persistido compatível.

Isso evita falha de foreign key com placeholders (`p-home-8`, `p-away-5`) em ambiente PostgreSQL real.

### 5) Como `recentEvents` é reconstruído no Prisma

`getMatchState` busca:

- `currentEvent` da partida via `currentEventId`;
- últimos eventos da partida ordenados por turno/data.

Depois reconstrói `recentEvents` filtrando o `currentEvent` e mantendo os demais como histórico de feed.

### 6) Migrations

- Nesta revisão, **migrations reais não foram geradas/aplicadas ainda**.
- Foi entregue `schema.prisma` + scripts Prisma para geração e execução de migrações.

## Scripts úteis

### Raiz

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`

### API / Prisma

- `npm run prisma:generate -w @telesoccer/api`
- `npm run prisma:migrate:dev -w @telesoccer/api`
- `npm run prisma:deploy -w @telesoccer/api`
- `npm run build -w @telesoccer/api` (gera Prisma Client antes do TypeScript build)

## Railway

- `railway.json` com build Nixpacks e start via `npm run start`.
- No pacote `@telesoccer/api`, `postinstall` e `build` executam `prisma generate` para garantir `@prisma/client` tipado antes do `tsc`.
- Variáveis principais:
  - `PORT`
  - `DATABASE_URL` (ativa persistência Prisma/PostgreSQL)
  - `CORS_ORIGIN` (opcional)
