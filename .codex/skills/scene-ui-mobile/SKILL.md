---
name: scene-ui-mobile
description: Orienta implementação da interface mobile-first de partida por cenas do TeleSoccer Web, garantindo HUD mínima (placar/minuto/times), SceneCard, ActionPanel, PossessionIndicator e EventFeed com integração à API sem lógica de negócio no React.
---

# scene-ui-mobile

## Nome da skill

`scene-ui-mobile`

## Objetivo

Garantir que a interface do TeleSoccer Web seja de jogo por cenas, mobile-first e integrada ao backend, evitando aparência de dashboard/CRUD.

## Quando usar

- Criação/refatoração de componentes da tela de partida.
- Evolução de layout mobile-first.
- Integração de `visualPayload` na renderização.
- Ajuste de fluxo de ação do jogador na UI.

## Quando não usar

- Alterações exclusivas de backend sem impacto de UI.
- Mudanças de schema Prisma sem reflexo visual.

## Entradas esperadas

- Estado atual da partida vindo da API.
- Componentes impactados.
- Requisitos de interação (ações, avanço de turno, feed).

## Saídas obrigatórias

1. Tela de partida com componentes separados.
2. Fluxo de carregamento/erro/estado vazio coerente.
3. Integração com API client e store previsível.
4. Garantia explícita de ausência de regra de negócio em componente.

## Regras obrigatórias

1. Componentes obrigatórios no MVP:
   - `MatchHeader`
   - `SceneCard`
   - `ActionPanel`
   - `PossessionIndicator`
   - `EventFeed`
2. Layout mobile-first por padrão (largura estreita primeiro).
3. UI apenas envia intenção (`PASS`, `DRIBBLE`, etc.).
4. Resultado da jogada vem exclusivamente do backend.
5. Feed deve mostrar eventos recentes reais.

## Critérios de bloqueio

- Componente React decidindo sucesso/falha da jogada.
- Tela sem estrutura mínima de partida.
- Fluxo de turno não integrado com API real.
- UI com semântica de dashboard administrativo.

## Critérios de aprovação

- Experiência centralizada na cena atual.
- Ações disponíveis refletindo `availableActions` da API.
- Indicador de posse, placar, minuto e feed renderizados.
- Estado de loading/erro tratado sem quebrar fluxo.

## Erros comuns que a skill deve evitar

- Hardcode de estado de partida sem sincronização com backend.
- Botão de avanço habilitado em momento incorreto.
- Texto de narrativa desconectado do `currentEvent`.

## Sinais de implementação fraca

- Card visual estático sem uso de `sceneKey/frameType`.
- Ações fixas em tela mesmo quando backend não permite.
- Feed vazio permanente apesar de eventos persistidos.

## Sinais de implementação aceitável

- Componentização limpa e reutilizável.
- Página de partida compõe componentes sem lógica de regra.
- Store concentra chamadas assíncronas e estado de UI.

## Checklist de validação

- [ ] Tela de partida é mobile-first.
- [ ] Componentes obrigatórios existem e são usados.
- [ ] UI consome `matchState` da API real.
- [ ] Nenhum componente decide regra do jogo.
- [ ] Fluxo criar partida → buscar estado → ação → avançar turno funciona.

## Exemplo de uso (TeleSoccer)

**Entrada:** “Implementar render específico para `SHOT_SCENE`.”

**Aplicação da skill:**

1. Adaptar `SceneCard` (ou componente dedicado) para usar `frameType`.
2. Manter decisão de evento no backend.
3. Garantir fallback visual para frames sem asset final.
4. Validar experiência mobile (scroll, espaçamento, toque).

**Saída esperada:**

UI de partida com identidade de jogo por cenas, integrada e sem acoplamento de regra.
