# TeleSoccer — camada visual placeholder do Telegram

## Objetivo

Dar ao turno de partida uma aparência de jogo no Telegram antes da arte final, sem alterar regra de negócio nem a engine da partida.

## Assets placeholder gerados

### 1. HUD de partida
- Slot: `telegram.match.widget.hud`
- Papel: placar, minuto, energia e contexto em leitura rápida.
- Implementação atual: cabeçalho do card placeholder em `src/presentation/telegram-match-placeholder-renderer.ts`.

### 2. Card visual do lance
- Slot: `telegram.match.widget.play-card`
- Papel: canvas principal do turno entregue ao Telegram.
- Implementação atual: card vertical estilo mensagem do Telegram, com hero image dominante, bloco narrativo em tipografia forte, mini campo e badges de ação.

### 3. Mini campo
- Slot: `telegram.match.widget.mini-pitch`
- Papel: indicar posse e setor do lance de forma rápida.
- Implementação atual: `renderMiniPitchPlaceholder` em `src/assets/telegram/match-placeholder-art.ts`.

### 4. Ícones de ação
- Slots: `telegram.match.action-icon.*`
- Papel: representar visualmente as ações principais visíveis no teclado.
- Implementação atual: `matchActionPlaceholderIcons` em `src/assets/telegram/match-placeholder-art.ts`.

### 5. Cenas placeholder de passe, drible, chute, defesa e gol
- Slots: `telegram.match.scene.*`
- Papel: hero frame do lance; lances de circulação usam mapa tático completo e lances críticos usam enquadramento cinematográfico.
- Implementação atual: `src/assets/scenes/match-scene-art.ts` + prompt/slot em `matchScenePlaceholderPrompts`.

## Naming convention para arte final

### Widgets
- `telegram.match.widget.hud`
- `telegram.match.widget.play-card`
- `telegram.match.widget.mini-pitch`

### Ícones
- `telegram.match.action-icon.pass`
- `telegram.match.action-icon.dribble`
- `telegram.match.action-icon.shoot`
- etc.

### Cenas
- `telegram.match.scene.pass-received`
- `telegram.match.scene.pass-intercepted`
- `telegram.match.scene.dribble`
- `telegram.match.scene.defensive-duel`
- `telegram.match.scene.shot`
- `telegram.match.scene.goalkeeper-save`
- `telegram.match.scene.goal`
- `telegram.match.scene.rebound`
- `telegram.match.scene.corner-kick`
- `telegram.match.scene.penalty-kick`
- `telegram.match.scene.fallback`

## Pontos exatos de substituição por arte final

### 1. Ícones de ação
Substituir os glyphs em:
- `src/assets/telegram/match-placeholder-art.ts`
- Estrutura: `matchActionPlaceholderIcons[*].glyph`

### 2. Mini campo
Substituir o renderer em:
- `src/assets/telegram/match-placeholder-art.ts`
- Função: `renderMiniPitchPlaceholder`

### 3. Cenas principais
Substituir os SVGs de cena em:
- `src/assets/scenes/match-scene-art.ts`
- Estrutura: `matchSceneAssets[*].svg`

### 4. Card consolidado enviado ao Telegram
Substituir a composição do card em:
- `src/presentation/telegram-match-placeholder-renderer.ts`
- Função: `renderTelegramMatchPlaceholderCard`

### 5. Presenter do Telegram
Se a arte final exigir outro empacotamento, trocar em:
- `src/infra/telegram/match-visual-presenter.ts`
- Função: `presentTelegramMatchVisual`

## Prompts padronizados para arte final externa

### Prompt-base de widget
> TeleSoccer final art, football mobile UI, high contrast, fast readability, Telegram-safe composition, reserve safe areas for HUD and action buttons, vector or paint-over compatible with SVG export.

### Prompt-base de cena
> TeleSoccer final art, football mobile scene, 16:9, strong contrast, readable at small Telegram sizes, clear focus on ball/carrier/goal, leave upper HUD safe area and lower action safe area.

### Prompt-base de ícone
> TeleSoccer final art, football mobile action icon, square badge, transparent background, thick silhouette, readable in small size, keep safe margins for future sprite export.

## Compatibilidade com Telegram

- O SVG continua sendo a fonte principal do card placeholder.
- O backend rasteriza esse SVG para PNG antes do envio ao Telegram.
- O Telegram usa `sendPhoto` como mídia principal quando existe `scene`.
- A caption curta continua separada do SVG para manter leitura rápida no chat.
- Se o upload da foto falhar, o runtime faz fallback para `sendMessage`, preservando texto e teclado de ações.

## Limitações técnicas reais do rasterizador atual

- O rasterizador atual **não é um renderizador SVG completo**.
- Ele suporta apenas o subset SVG usado hoje pela camada placeholder do TeleSoccer:
  - `rect`
  - `circle`
  - `line`
  - `path`
  - `text`
  - `image` com `data:image/svg+xml`
  - `linearGradient` usado pelo card atual
  - `transform` básico (`translate`, `scale`, `rotate`)
- Não há suporte completo para CSS, filtros, máscaras, `clipPath`, imagens remotas, `foreignObject` ou recursos SVG avançados.
- O objetivo desta camada atual é fidelidade suficiente ao placeholder oficial, não cobertura genérica de SVG.

## Evolução futura

- O ponto oficial de evolução continua sendo a substituição dos placeholders por arte final.
- Quando a arte final exigir novos recursos visuais, o renderer SVG e o rasterizador backend devem evoluir juntos, sem quebrar o fluxo atual `SVG -> PNG -> sendPhoto -> fallback textual`.
