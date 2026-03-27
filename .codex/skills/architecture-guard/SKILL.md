---
name: architecture-guard
description: Protege a arquitetura do TeleSoccer Web contra acoplamento indevido entre domínio, aplicação, infraestrutura e apresentação. Use quando criar/refatorar API Fastify, serviços de aplicação, repositórios Prisma, componentes React, Zustand store, rotas HTTP, ou quando houver risco de regra de negócio em UI/rotas/main.ts.
---

# architecture-guard

## Nome da skill

`architecture-guard`

## Objetivo

Aplicar guardrails arquiteturais obrigatórios no TeleSoccer Web para impedir regressões estruturais, mantendo separação clara entre:

- `src/domain`
- `src/application`
- `src/infra`
- `src/presentation`
- `src/shared`

## Quando usar

- Antes de implementar uma feature nova.
- Antes de refatorar serviços, rotas ou componentes.
- Em revisão de PR com múltiplas camadas tocadas.
- Quando houver suspeita de lógica de negócio no frontend ou em rotas.

## Quando não usar

- Ajustes puramente textuais sem impacto técnico (ex.: correção ortográfica em docs).
- Mudanças de build sem alteração de arquitetura interna.

## Entradas esperadas

- Lista de arquivos alterados (ou diff).
- Objetivo funcional da mudança.
- Camadas impactadas.
- Contratos API envolvidos (`MatchStateView`, `MatchEvent`, etc.).

## Saídas obrigatórias

1. Diagnóstico por camada (`domain/application/infra/presentation/shared`).
2. Lista de violações detectadas.
3. Correções obrigatórias para remover violações.
4. Decisão final: **APROVADO** ou **BLOQUEADO**.

## Regras obrigatórias

1. Nunca colocar regra de negócio em componente React.
2. Nunca centralizar fluxo de negócio em `main.ts` ou em arquivos de rota.
3. Serviços de aplicação orquestram casos de uso; repositórios apenas persistem/consultam.
4. Domínio não depende de Fastify, Prisma ou React.
5. `presentation` só traduz HTTP/UI para chamadas de aplicação.
6. README não pode prometer estrutura que não existe no código.

## Critérios de bloqueio

Bloquear imediatamente quando houver:

- Cálculo/regras de resolução de jogada dentro de componentes React.
- Lógica principal de turno/evento dentro de `routes/*.ts`.
- Acesso direto ao Prisma fora de `infra`.
- Dependência de `@prisma/client` dentro de `domain`.
- Estado global duplicado com fontes conflitantes (ex.: lógica de regra duplicada em API e Web).

## Critérios de aprovação

Aprovar somente quando:

- Fluxo principal passa por `application`.
- Persistência encapsulada por interface de repositório.
- `main.ts` apenas bootstrap.
- Componentes React apenas renderizam + disparam intenções.
- Contratos entre API e Web estão explícitos e coerentes.

## Erros comuns que a skill deve evitar

- “Refatoração parcial” que muda nomes, mas mantém acoplamento.
- “Separação fake” (arquivo novo, responsabilidade antiga).
- Transferir problema da rota para store frontend.
- Tratar app como dashboard CRUD.

## Sinais de implementação fraca

- Rota com dezenas de linhas de regra condicional de jogo.
- `MatchPage.tsx` decidindo sucesso/falha de ação.
- Repositório retornando payload de UI pronto sem passar por aplicação.
- `main.ts` registrando regras de domínio manualmente.

## Sinais de implementação aceitável

- `routes` validam entrada e chamam serviço de aplicação.
- Serviço de aplicação decide fluxo do turno.
- Repositório só executa operações de estado/persistência.
- UI usa store para fluxo assíncrono sem decidir resultado da jogada.

## Checklist de validação

- [ ] Existe separação real de camadas nos arquivos alterados.
- [ ] Não há regra de domínio em React.
- [ ] Não há regra de domínio em `main.ts`/rotas.
- [ ] Repositório encapsula infraestrutura.
- [ ] Serviços de aplicação são o centro da orquestração.
- [ ] README não está mais avançado que a implementação.

## Exemplo de uso (TeleSoccer)

**Entrada:** “Adicionar endpoint de avanço de turno com persistência Prisma.”

**Aplicação da skill:**

1. Verificar se rota apenas chama `MatchApplicationService.advanceTurn`.
2. Verificar se regra de transição de turno está em `application/domain`.
3. Verificar se `PrismaMatchRepository` apenas persiste e retorna estado.
4. Bloquear PR se houver regra de jogo no controller.

**Saída esperada:**

- Aprovado quando arquitetura permanece limpa.
- Bloqueado quando a regra estiver acoplada à camada errada.
