# ETAPA 2 — Plano de Refatoração Incremental (TeleSoccer)

## Objetivo

Consertar e evoluir o TeleSoccer sem quebra de fluxo, mantendo arquitetura limpa e o produto como **web app mobile-first de futebol por turnos baseado em cenas**.

## Diagnóstico rápido da base atual

### Pontos fortes reaproveitáveis

- Separação inicial entre `domain`, `application`, `infra` e `presentation` na API.
- `MatchApplicationService` já centraliza orquestração de casos de uso.
- Repositório com estratégia híbrida (`InMemory` local / `Prisma` com `DATABASE_URL`) preparada para Railway.
- Frontend com API client dedicado e store separada de componentes visuais.

### Riscos atuais

1. Falta de suíte de testes automatizados por camada (principalmente domínio/aplicação).
2. Contratos API-Web dependem de alinhamento manual; falta validação de compatibilidade contínua.
3. Ausência de checklist técnico versionado por release (build/deploy/health/fluxo de partida).
4. Lógica de fluxo de partida ainda com pouca proteção contra regressões para multiplayer futuro.

## Princípios obrigatórios da refatoração

1. Não mover regra de negócio para React, rotas HTTP ou `main.ts`.
2. Regras de jogo permanecem em `domain` e orquestração em `application`.
3. Persistência encapsulada em `infra` via contrato de repositório.
4. Mudanças pequenas, revisáveis e com validação de build/typecheck.
5. Sem remover funcionalidades/painéis importantes sem justificativa explícita.

## Plano incremental (execução sugerida)

### Fase A — Estabilização (curto prazo)

- [ ] Consolidar validações de entrada de rotas para evitar divergência de payload.
- [ ] Garantir mensagens de erro padronizadas para web consumir sem lógica duplicada.
- [ ] Adicionar testes de fumaça para endpoints críticos:
  - `POST /matches`
  - `GET /matches/:matchId/state`
  - `POST /matches/:matchId/actions`
  - `POST /matches/:matchId/advance`

### Fase B — Segurança arquitetural

- [ ] Extrair contratos compartilhados sensíveis para módulo único com validação de compatibilidade.
- [ ] Adicionar verificação automática em CI para bloquear regressão de acoplamento entre camadas.
- [ ] Documentar fronteiras por camada com exemplos permitidos/proibidos.

### Fase C — Pronto para multiplayer

- [ ] Revisar modelo de turno para concorrência de ações de jogadores.
- [ ] Introduzir estratégia de controle de versão de estado (optimistic locking/event version).
- [ ] Definir contrato de evento de jogo estável para replay/auditoria de partidas.

### Fase D — Operação Railway

- [ ] Checklist por ambiente com variáveis obrigatórias:
  - API: `NODE_ENV`, `HOST`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`
  - WEB: `VITE_API_URL`
- [ ] Procedimento de diagnóstico rápido para incidentes de `Failed to fetch`, CORS e bootstrap.

## Critérios de pronto por ciclo

Cada PR de refatoração deve:

1. Preservar fluxo de jogo por cenas no frontend.
2. Passar em `npm run build` e `npm run typecheck`.
3. Não introduzir regra de negócio na camada errada.
4. Atualizar documentação de impacto arquitetural.

## Próximo passo recomendado

Iniciar pela **Fase A** com PR pequeno focado em:

- padronização de resposta de erro das rotas de match;
- teste de fumaça dos 4 endpoints críticos;
- garantia de não regressão no deploy Railway.
