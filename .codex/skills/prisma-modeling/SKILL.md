---
name: prisma-modeling
description: Define e revisa modelagem Prisma do TeleSoccer Web com foco em consistência entre Match, MatchTurn, MatchEvent, Team, Player, MatchLineup e MatchParticipantAction. Use quando criar/alterar schema.prisma, migrações, repositórios Prisma e contratos de persistência.
---

# prisma-modeling

## Nome da skill

`prisma-modeling`

## Objetivo

Garantir modelagem de dados consistente, evolutiva e segura para o jogo por turnos, com integridade entre entidades centrais de partida.

## Quando usar

- Criação/alteração de `schema.prisma`.
- Ajuste de relações entre entidades de partida.
- Inclusão de campos de persistência para novos eventos/ações.
- Revisão de impacto de migrações.

## Quando não usar

- Ajustes exclusivamente de UI.
- Refatorações sem impacto no modelo de dados.

## Entradas esperadas

- Requisitos de negócio para dados persistentes.
- Entidades impactadas.
- Campos novos/alterados.
- Regras de integridade necessárias.

## Saídas obrigatórias

1. `schema.prisma` atualizado.
2. Justificativa de cada relação/enum/campo relevante.
3. Impacto esperado em repositórios e serviços.
4. Plano de migração (dev/deploy) com comandos Prisma.

## Regras obrigatórias

1. `Match` deve registrar ao menos:
   - placar, minuto, posse, turno, modo de resolução e `currentEventId`.
2. `MatchEvent` deve registrar ao menos:
   - tipo, turno, minuto, narrativa, `sceneKey`, `frameType`, `visualPayload`, `success`, `primaryPlayerId`, `secondaryPlayerId`.
3. `MatchTurn` deve registrar contexto do turno para auditoria da partida.
4. Relações devem ter estratégia explícita de `onDelete`.
5. Campos JSON devem ser usados apenas para contexto variável (`visualPayload`, `tacticalContext`, metadata).

## Critérios de bloqueio

- Campo obrigatório de evento/partida ausente.
- Relações ambíguas sem nome quando há múltiplas referências entre os mesmos modelos.
- Dependência de inferência implícita que gera migração insegura.
- Tipo inadequado para payload visual (ex.: string solta em vez de JSON estruturado).

## Critérios de aprovação

- Todas as entidades obrigatórias existem e se relacionam corretamente.
- Índices e constraints mínimas para busca por partida/turno/evento estão definidos.
- Repositórios conseguem mapear estado sem hacks.

## Erros comuns que a skill deve evitar

- Modelar evento sem vínculo com `Match` e `turnNumber`.
- Guardar dados estruturados em campos textuais.
- Criar enum sem refletir casos reais do jogo.
- Duplicar informações essenciais em múltiplos modelos sem motivo.

## Sinais de implementação fraca

- `MatchEvent` sem `frameType`.
- `Match` sem `currentEventId`.
- ausência de índices para consultas frequentes (`matchId`, `turnNumber`, `minute`).

## Sinais de implementação aceitável

- Modelos canônicos do jogo presentes e íntegros.
- Eventos e turnos auditáveis.
- Estrutura pronta para crescimento multiplayer.

## Checklist de validação

- [ ] Entidades obrigatórias criadas no schema.
- [ ] Campos mínimos de `Match` e `MatchEvent` atendidos.
- [ ] Relações nomeadas quando necessário.
- [ ] Índices úteis definidos.
- [ ] Scripts Prisma disponíveis (`generate`, `migrate`, `deploy`).

## Exemplo de uso (TeleSoccer)

**Entrada:** “Adicionar suporte a `penalty-kick` com rastreio de batedor e goleiro.”

**Aplicação da skill:**

1. Confirmar enum `MatchEventType.PENALTY_KICK`.
2. Garantir `primaryPlayerId` (batedor) e `secondaryPlayerId` (goleiro).
3. Validar `visualPayload` com cena de pênalti.
4. Revisar repositório para mapear novo evento sem quebrar os anteriores.

**Saída esperada:**

Schema, mapeamentos e persistência consistentes para o novo tipo de evento.
