# TeleSoccer Web — definição oficial do produto (modelo 22 jogadores)

## 1) Regra principal oficial

A partir desta definição, o TeleSoccer Web adota como modelo central:

- **1 partida suporta 22 jogadores em campo (11 por time)**.
- **Cada jogador em campo pode ser controlado por um usuário real**.
- **Toda vaga não ocupada por usuário deve ser preenchida por bot**.

Isso implica suporte obrigatório para composição híbrida:

- 22 humanos;
- parte humanos + parte bots;
- times inteiros controlados por bots.

> Esta é a premissa principal do produto. O modelo “1 usuário controla um time inteiro” deixa de ser a premissa central.

> Observação de escopo desta definição: as 22 vagas representam os **11 titulares de cada lado em campo**. Banco/reservas e substituições ficam como expansão futura do produto.

---

## 2) Diagnóstico do estado atual do repositório

### 2.1 O que já serve para a nova visão

1. **Arquitetura em camadas backend já existe** (`domain`, `application`, `infra`, `presentation`, `shared`) e mantém o backend como resolvedor de turnos/eventos.
2. **Modelagem base de entidades já existe no Prisma** (`User`, `Team`, `Player`, `Match`, `MatchTurn`, `MatchEvent`, `MatchLineup`, `MatchParticipantAction`).
3. **Frontend atual não resolve jogada**: o React consome estado/evento da API e envia intenção de ação.
4. **Persistência real já está preparada via Prisma/PostgreSQL** quando `DATABASE_URL` está configurada.

### 2.2 O que ainda NÃO está implementado (gap real)

1. **Não existe no schema atual o vínculo explícito “vaga da escalação -> usuário controlador”**.
2. **Não existe no schema atual o conceito explícito de “controle por bot vs humano” por vaga**.
3. **Não existe regra de garantia de 22 vagas ativas por partida (11 HOME + 11 AWAY) com integridade de posição/slot**.
4. **Não existe fluxo de entrada/associação de usuário em vaga de jogador da partida**.
5. **Não existe fallback automático persistido para ausência/inatividade do usuário por vaga**.
6. **Não existe orquestração completa de turnos com “somente participantes do lance precisam agir” baseada no controlador da vaga**.

Conclusão: a base atual é **boa fundação arquitetural**, mas o multiplayer híbrido por jogador **ainda não está pronto**.

---

## 3) Conceitos oficiais (canônicos)

- `User`: pessoa real autenticada/conectada.
- `Player`: atleta virtual do jogo (atributos futebolísticos), pertencente a um `Team`.
- `Match`: instância de partida com estado, placar, posse, turnos e eventos.
- `MatchLineup`: escalação da partida com **22 vagas de campo** (11 por time), cada vaga vinculada a um `Player`.
- `Controlador da vaga`: quem decide ação do jogador daquela vaga no turno relevante:
  - `HUMAN` quando há `User` vinculado e ativo;
  - `BOT` quando não há `User` ou quando há fallback por ausência/inatividade.

---

## 4) Proposta oficial de modelo de dados

## 4.1 Diretriz estrutural

Manter `MatchLineup` como entidade central da escalação da partida e transformá-la na fonte de verdade para:

- composição de 22 jogadores em campo;
- vínculo opcional com `User` controlador;
- estratégia de fallback humano/bot por vaga.

## 4.2 Novos enums sugeridos

- `LineupControlMode`
  - `HUMAN`
  - `BOT`
- `LineupControlStatus`
  - `ACTIVE`
  - `INACTIVE`
  - `DISCONNECTED`
  - `TIMED_OUT`

## 4.3 Evolução proposta de `MatchLineup`

Adicionar em `MatchLineup`:

- `slotNumber Int` (1..11 por `teamId` dentro da partida)
- `isOnField Boolean @default(true)`
- `controllerUserId String?`
- `controlMode LineupControlMode @default(BOT)`
- `controlStatus LineupControlStatus @default(INACTIVE)`
- `lastHeartbeatAt DateTime?`
- `fallbackToBotAt DateTime?`

Relações:

- `controllerUser User? @relation(fields: [controllerUserId], references: [id], onDelete: SetNull)`

Constraints/índices recomendados:

- `@@unique([matchId, teamId, slotNumber])` (garante 11 vagas por lado sem duplicidade de slot)
- `@@unique([matchId, teamId, playerId])` (já existente, manter)
- `@@index([matchId, teamId, controlMode])`
- `@@index([matchId, controllerUserId])`

## 4.4 Nova entidade recomendada: `MatchUserSession`

Objetivo: rastrear presença do usuário na partida sem poluir entidades de domínio esportivo.

Campos sugeridos:

- `id String @id @default(uuid())`
- `matchId String`
- `userId String`
- `teamId String?`
- `status MatchUserSessionStatus` (`CONNECTED`, `DISCONNECTED`, `LEFT`)
- `connectedAt DateTime @default(now())`
- `lastSeenAt DateTime`
- `disconnectedAt DateTime?`

Constraints:

- `@@unique([matchId, userId])`
- `@@index([matchId, status])`

> `MatchUserSession` trata presença/conexão; `MatchLineup` trata propriedade de controle por vaga/jogador.

## 4.5 Ajustes em `MatchParticipantAction`

Para auditoria de decisão humano/bot no turno:

- adicionar `lineupId String?`
- adicionar `actorType ParticipantActorType` (`HUMAN`, `BOT`, `SYSTEM`)
- adicionar `controllerUserId String?`
- adicionar `resolvedByFallback Boolean @default(false)`
- adicionar `resolutionReason String?` (ex.: `USER_TIMEOUT`, `USER_DISCONNECTED`, `NO_USER_ASSIGNED`)

Com isso, cada ação aplicada no turno informa exatamente **quem decidiu**.

---

## 5) Regras funcionais obrigatórias no backend

1. **Criação da partida**:
   - gerar `Match`;
   - gerar `MatchLineup` com 22 vagas de campo (11 HOME + 11 AWAY), todas inicialmente com `controlMode=BOT`.

2. **Entrada de usuário na partida**:
   - registrar/atualizar `MatchUserSession`;
   - permitir claim de vaga elegível em `MatchLineup`;
   - ao claim, setar `controllerUserId`, `controlMode=HUMAN`, `controlStatus=ACTIVE`.

3. **Composição híbrida**:
   - vaga com usuário ativo => ação humana quando o lance exigir aquele jogador;
   - vaga sem usuário/usuário inativo => ação BOT.

4. **Fallback automático por ausência/inatividade**:
   - por timeout de ação, desconexão ou heartbeat expirado;
   - atualizar `MatchLineup` para estado de fallback (`controlMode=BOT`, status apropriado);
   - registrar motivo em `MatchParticipantAction`.

5. **Turnos com participantes relevantes**:
   - o motor define quais `lineupId/playerId` participam do lance;
   - somente esses participantes entram em estado “aguardando ação” quando aplicável;
   - o restante segue sem bloqueio.

6. **Frontend**:
   - apenas renderiza “quem está controlando cada vaga” e estado de disponibilidade;
   - não decide resultado de jogada;
   - não implementa fallback de domínio fora da API.

## 5.1 Orquestração de entrada na partida (visão oficial)

Fluxo objetivo para composição de partida híbrida:

1. **Criação da partida**: backend cria `Match` e define as 22 vagas de titulares em `MatchLineup` (11 HOME + 11 AWAY), inicialmente aptas a controle por bot.
2. **Entrada de usuários**: usuários reais entram na partida e ficam elegíveis para assumir vaga específica.
3. **Claim de vaga**: usuário associa-se a uma vaga/jogador da escalação, tornando o controle daquela vaga humano quando ativo.
4. **Composição híbrida humano/bot**: vagas sem usuário (ou com fallback por ausência/inatividade) seguem sob controle bot, preservando continuidade da partida.

---

## 6) Impacto arquitetural por camada

### `domain`

- incluir política de seleção de ator da ação (`HUMAN`/`BOT`) por vaga.
- incluir regras de timeout/fallback.
- manter regras puras sem dependência de Prisma/Fastify/React.

### `application`

- novos casos de uso:
  - `joinMatch(userId, matchId)`
  - `claimLineupSlot(userId, matchId, teamSide, slotNumber)`
  - `releaseLineupSlot(...)`
  - `heartbeatMatchUser(...)`
  - `resolvePendingParticipantActions(...)`
- orquestrar fallback automático e persistência auditável.

### `infra`

- evolução do `schema.prisma` + migrations.
- implementação de repositórios Prisma para lineup/session/action-log.
- índices para leitura rápida por `matchId` e estado de controle.

### `presentation`

- rotas HTTP apenas para traduzir request/response dos casos de uso.
- sem lógica de regra de jogo na rota.

### `web/presentation`

- exibir slots, donos humanos e bots em HUD/painel.
- enviar intenções de claim/ação/heartbeat.
- sem cálculo de sucesso/fracasso de jogada.

---

## 7) Sequência ideal de implementação (incremental e revisável)

### Fase 1 — Dados e contratos

1. Evoluir Prisma (`MatchLineup`, `MatchParticipantAction`, nova `MatchUserSession`, enums).
2. Criar migração.
3. Atualizar contratos compartilhados para refletir controle por vaga.

### Fase 2 — Casos de uso multiplayer por jogador

1. Implementar `joinMatch` e `claimLineupSlot`.
2. Garantir invariantes de 22 vagas e unicidade por slot.
3. Expor rotas mínimas para entrada/claim/listagem de lineup.

### Fase 3 — Turno híbrido com fallback

1. Integrar decisão humano/bot no pipeline de turno.
2. Implementar timeout/heartbeat e fallback automático.
3. Persistir auditoria completa em `MatchParticipantAction`.

### Fase 4 — UI mobile-first orientada a cenas

1. Mostrar lineup com indicador HUMANO/BOT por vaga.
2. Mostrar “ação pendente para você” apenas quando usuário controla participante do lance.
3. Manter cena/evento/placar/minuto como HUD principal.

### Fase 5 — Robustez operacional

1. testes de integração API + Prisma para cenários: 22 humanos, híbrido, 100% bots.
2. testes de timeout e reconexão.
3. observabilidade básica (logs de fallback por motivo).

---

## 8) Reaproveitamento e descarte objetivos

## 8.1 Reaproveitar

- separação por camadas já existente;
- motor de turnos/eventos já centralizado no backend;
- persistência via repositório Prisma;
- componentes de cena e fluxo de renderização no frontend.

## 8.2 Descartar como premissa principal

- “1 usuário controla um time inteiro” como modelo central.

Motivo: não atende a definição oficial de produto baseada em 22 vagas controláveis individualmente.

---

## 9) Declaração final oficial

O TeleSoccer Web passa a ter oficialmente como modelo principal:

- **22 jogadores na partida**;
- **usuários controlam jogadores específicos**;
- **bots ocupam vagas vazias (e vagas em fallback por ausência/inatividade)**.

Essa decisão orienta evolução de domínio, aplicação, infraestrutura, apresentação e documentação daqui em diante.
