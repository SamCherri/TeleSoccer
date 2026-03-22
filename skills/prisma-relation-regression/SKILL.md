# Skill: prisma-relation-regression

## Objetivo
Detectar regressões relacionais do Prisma antes que cheguem ao Railway e quebrem criação de entidades ligadas ao jogo.

## Cobertura mínima
- `createMatchForPlayer` usa `connect` nas relações obrigatórias
- `resolveTurn` usa `connect` nas relações obrigatórias
- `createSession` multiplayer usa `connect`
- `joinSession` e bot fallback usam `connect`
- `applyTraining` e `registerTryout` usam `connect`
- auditoria textual em `src/infra/prisma/` para evitar FK crua em `create` relacional

## Comandos úteis
- `npm test -- tests/prisma-relation-regression.test.js`
- `node --test tests/prisma-relation-regression.test.js`
