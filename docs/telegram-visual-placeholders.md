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
- Implementação atual: SVG 1080x1350 com HUD, janela principal da cena, mini campo e badges de ação.

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
- Papel: hero frame do lance.
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

- O fluxo atual prioriza SVG versionável e renderizável via upload como documento.
- O canvas placeholder foi montado em um único SVG vertical para ficar legível no Telegram sem depender de arte final.
- Se no futuro houver rasterização para PNG, o ponto de entrada natural é o renderer `renderTelegramMatchPlaceholderCard`.
