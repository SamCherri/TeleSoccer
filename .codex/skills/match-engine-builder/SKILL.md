---
name: match-engine-builder
description: Orienta a implementação do motor de partida do TeleSoccer Web com pipeline de turno, modelagem de posse/zona/evento/ação e separação de domínio-aplicação-infra-apresentação. Use quando criar regras de resolução de jogadas, tipos de evento, fluxo automático/interativo e narrativa por cenas.
---

# match-engine-builder

## Nome da skill

`match-engine-builder`

## Objetivo

Construir e evoluir o motor de partida por turnos do TeleSoccer Web sem acoplamento indevido, garantindo:

- pipeline consistente de turno
- eventos persistíveis
- narrativa em pt-BR
- saída visual (`visualPayload`) consumível pelo frontend

## Quando usar

- Implementação de novas ações do jogador.
- Implementação de novos tipos de evento.
- Ajuste de regras de posse, zona e confronto.
- Evolução da orquestração de turno no backend.

## Quando não usar

- Mudanças puramente visuais sem impacto em fluxo de jogo.
- Ajustes de configuração de deploy sem impacto no motor.

## Entradas esperadas

- Tipo de ação/evento a implementar.
- Estado mínimo atual do `Match`.
- Regras de sucesso/falha.
- Requisitos de narrativa e frameType.

## Saídas obrigatórias

1. Regras de domínio explícitas para a ação/evento.
2. Orquestração no serviço de aplicação.
3. Persistência de `MatchTurn` + `MatchEvent`.
4. `visualPayload` coerente para renderização.
5. Atualização de `recentEvents` consistente.

## Regras obrigatórias

1. Seguir pipeline de turno:
   - ler estado
   - identificar posse/zona/participantes
   - decidir evento
   - resolver regra
   - gerar evento
   - escolher cena
   - gerar narrativa
   - persistir turno/evento
   - retornar payload ao frontend
2. A interface nunca decide resultado da jogada.
3. Cada evento precisa ter `key`, `frameType`, `sceneKey`, `narrativeText`, `visualPayload` e `success` quando aplicável.
4. A transição de `AUTO` x `REQUIRES_PLAYER_ACTION` deve ser explícita.

## Critérios de bloqueio

- Evento sem persistência em `MatchEvent`.
- Turno avançado sem criar/atualizar `MatchTurn`.
- `visualPayload` incompleto ou inconsistente com o evento.
- `recentEvents` não atualizado com base em histórico real.
- Regra de resolução duplicada entre backend e frontend.

## Critérios de aprovação

- Fluxo completo de turno fecha ponta a ponta.
- Estado final do `Match` reflete evento e turno atual.
- Eventos anteriores aparecem no feed (`recentEvents`).
- Tipagem cobre ação, evento e resposta da API.

## Erros comuns que a skill deve evitar

- Criar evento sem vincular ao turno.
- Atualizar minuto/turno sem persistir evento corrente.
- Narrativa estática repetitiva sem variação mínima.
- Ignorar `frameType` na resolução.

## Sinais de implementação fraca

- `advanceTurn` só incrementa contador sem semântica.
- `submitAction` não altera `turnResolutionMode`.
- `currentEvent` muda, mas histórico não acompanha.

## Sinais de implementação aceitável

- Serviço de aplicação transforma ação em evento canônico.
- Repositório persiste evento + turno de forma transacional.
- Resposta da API já entrega estado pronto para renderização.

## Checklist de validação

- [ ] A ação do usuário entra como intenção e sai como evento resolvido.
- [ ] `Match` mantém `minute`, `turnNumber`, `turnResolutionMode`, `currentEventId`.
- [ ] `MatchEvent` guarda `sceneKey`, `frameType`, `visualPayload` JSON.
- [ ] `recentEvents` reflete histórico persistido.
- [ ] Resposta da API informa próximo passo (`SUBMIT_ACTION` ou `ADVANCE_TURN`).

## Exemplo de uso (TeleSoccer)

**Entrada:** “Implementar ação `PROTECT_BALL`.”

**Aplicação da skill:**

1. Definir regra de domínio: proteção aumenta chance de manter posse.
2. Mapear evento: `defensive-duel` ou `fallback-map` conforme resultado.
3. Persistir `MatchParticipantAction` + `MatchEvent` + `MatchTurn`.
4. Retornar `matchState` com narrativa e cena apropriadas.

**Saída esperada:**

Ação integrada ao ciclo completo, sem lógica no frontend, com persistência e feed atualizados.
