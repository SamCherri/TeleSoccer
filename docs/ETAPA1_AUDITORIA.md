# ETAPA 1 — Auditoria da base atual e arquitetura alvo (TeleSoccer Web)

## 1) Resumo objetivo da base atual

A base do repositório está extremamente enxuta e contém apenas:

- `README.md` com descrição de um backend inicial orientado a bot/webhook Telegram.
- `package.json` com `start` apontando para `src/app/index.js` e script de teste para `tests/*.test.js`.

Não existem, neste commit, os diretórios/arquivos citados no README (`src/`, `tests/`, Prisma, etc.).

## 2) Diagnóstico técnico da situação atual

### 2.1 Estado do código

- Não há implementação de domínio, aplicação, infraestrutura ou apresentação no workspace atual.
- Não há frontend React/Vite.
- Não há backend funcional presente em arquivos locais (apenas referência no README/package).
- Não há schema Prisma nem migrations.
- Não há configuração Railway além de menção textual no README.

### 2.2 Conflitos com o novo produto

O README atual descreve o produto como integração com Telegram/webhook, o que conflita diretamente com o novo direcionamento:

- Produto alvo agora é **web app jogável** (não bot de chat).
- Arquitetura deve ser organizada por camadas e orientada ao motor de partida por turnos.
- Frontend visual por cenas é requisito central e inexistente no estado atual.

## 3) Reaproveitamento possível

Como não há código-fonte funcional disponível além de documentação e manifest, o reaproveitamento direto é limitado a:

1. **Nome e contexto do produto** (`TeleSoccer`).
2. **Premissa de Node.js >=20** (já adequada para backend TypeScript moderno).
3. **Diretriz de uso de PostgreSQL no Railway** citada no README (conceito reaproveitável, implementação inexistente).

## 4) O que deve ser descartado/migrado

### 4.1 Descartar como referência de arquitetura

- Modelo centrado em webhook Telegram como eixo de produto.
- Endpoints antigos de players isolados (`/players`) sem contexto de partida por turnos.

### 4.2 Migrar para nova fundação

- Estrutura de projeto para monorepo de app web com backend + frontend + Prisma.
- Contratos de API orientados à partida (`match`, `turn`, `event`, `action`).
- Engine de regras de jogo separada da camada visual.

## 5) Arquitetura alvo proposta (MVP)

## 5.1 Estrutura de pastas proposta

```text
/
  apps/
    api/
      src/
        domain/
        application/
        infra/
        presentation/
        shared/
      prisma/
      package.json
      tsconfig.json
    web/
      src/
        presentation/
        shared/
      public/assets/scenes/
      package.json
      tsconfig.json
      vite.config.ts
  package.json
  tsconfig.base.json
  railway.json
  README.md
```

## 5.2 Camadas obrigatórias no backend (`apps/api/src`)

- `domain`: entidades, value objects, enums, motor de resolução de jogadas e regras puras.
- `application`: casos de uso (`createMatch`, `advanceTurn`, `submitAction`, `getMatchState`, `listEvents`) e narrativa.
- `infra`: Prisma client, repositórios concretos, config, adapters.
- `presentation`: controllers HTTP + rotas + validação DTO.
- `shared`: tipos comuns, utilitários puros, constantes.

## 5.3 Frontend (`apps/web/src`)

- Composição mobile-first com componentes de cena.
- Sem regra de domínio no React; apenas renderização e envio de intenção.
- Consumo de payload visual pronto vindo da API.

## 6) Pipeline funcional obrigatório de turno (confirmado para implementação)

1. Ler estado atual da partida.
2. Identificar posse, zona e participantes.
3. Decidir tipo de evento.
4. Resolver ação pela regra de negócio.
5. Gerar `MatchEvent`.
6. Selecionar cena visual no catálogo.
7. Gerar narrativa em pt-BR.
8. Persistir evento e turno.
9. Retornar payload pronto para renderização.

## 7) Plano técnico sequencial por etapa

### Etapa 2 (próxima)

- Consolidar estrutura de monorepo e contratos de camadas.
- Criar esqueleto de módulos backend/frontend com TypeScript.

### Etapa 3

- Definir `schema.prisma` com entidades mínimas:
  `User`, `Team`, `Player`, `Match`, `MatchTurn`, `MatchEvent`, `MatchLineup`, `MatchParticipantAction`.

### Etapa 4

- Implementar domínio do jogo: posse, zonas, ações, resolução de confrontos e transições.

### Etapa 5

- Implementar casos de uso e orquestração do turno.

### Etapa 6

- Expor API HTTP validada e tipada.

### Etapa 7

- Implementar tela MVP com HUD, cena, ações, posse e feed.

### Etapa 8

- Integrar frontend com backend (fluxo completo de turno).

### Etapa 9

- Preparar deploy Railway (build/start/env sem depender de `.env`).

## 8) Inventário inicial de arquivos para fundação (próximos commits)

## 8.1 Arquivos a criar

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/main.ts`
- `apps/api/src/domain/**`
- `apps/api/src/application/**`
- `apps/api/src/infra/**`
- `apps/api/src/presentation/**`
- `apps/api/src/shared/**`
- `apps/api/prisma/schema.prisma`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/presentation/components/**`
- `apps/web/src/presentation/pages/MatchPage.tsx`
- `apps/web/public/assets/scenes/**`
- `tsconfig.base.json`
- `railway.json`

## 8.2 Arquivos a alterar

- `package.json` (workspace scripts de build/dev/start/test).
- `README.md` (reposicionar produto e instruções de execução/deploy).

## 8.3 Arquivos candidatos a remoção/substituição

- Nenhum removido nesta etapa de auditoria.
- Em etapa de implementação, endpoints/descrições herdadas de bot serão substituídos por API de jogo.

## 9) Riscos identificados

1. Divergência entre documentação antiga (bot) e novo produto (web game).
2. Ausência total do código citado no README pode indicar histórico incompleto no repositório atual.
3. Necessidade de criar base quase do zero, com reaproveitamento conceitual e não de código.

## 10) Decisão de engenharia

Prosseguir com reconstrução estruturada do projeto como **TeleSoccer Web**, mantendo somente os elementos reaproveitáveis reais (nome, runtime Node e objetivo de deploy no Railway), e substituindo o restante por arquitetura limpa orientada a domínio e cenas visuais.
