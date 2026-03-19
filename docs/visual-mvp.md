# TeleSoccer - Visual MVP

## 1. Objetivo

Fazer o TeleSoccer parecer um jogo online de futebol mesmo operando principalmente via bot do Telegram.

## 2. Decisão de implementação

Backend e apresentação evoluem juntos.

Sempre que a regra entrega um novo estado jogável, a camada visual correspondente também é entregue no mesmo passo.

## 3. Componentes visuais textuais atuais

### Card de sessão multiplayer
Mostra:
- modo online
- código da sessão
- status
- política de preenchimento
- HOME vs AWAY
- humanos e bots por lado
- titulares e reservas por lado
- vagas abertas
- fallback elegível
- prontidão

### Card de elenco por lado
Mostra:
- lado
- titulares
- reservas
- identificação de humano/bot
- identificação de host/capitão

### Card de preparação de confronto
Mostra:
- HOME vs AWAY
- estado de prontidão
- faltas de humanos
- fallback elegível

### Card de partida
Mostra:
- identidade de match center
- placar
- minuto e tempo
- energia
- cartões
- lesão
- eventos recentes
- lance atual

## 4. Organização técnica

- `src/view-models/game-view-models.ts`
- `src/presentation/game-card-renderer.ts`

Essa separação deixa o projeto pronto para futuras interfaces leves adicionais sem mover regra de negócio para a camada visual.
