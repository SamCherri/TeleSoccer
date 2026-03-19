# TeleSoccer

TeleSoccer é um jogo online de futebol via bot no Telegram, com foco em:

- progressão de carreira do jogador
- partidas jogáveis por turnos
- persistência online em nuvem
- evolução para multiplayer
- camada visual mínima compatível com o jogo

## Estado atual do projeto

O projeto está sendo estruturado em fases.

No momento, a direção do produto prioriza um **MVP completo pré-Fase 3**, com quatro pilares:

1. carreira base do jogador
2. partida jogável por turnos
3. multiplayer MVP
4. visual MVP

## Stack principal

- Node.js
- TypeScript
- Prisma
- PostgreSQL
- Railway
- Telegram Bot API

## Princípios de arquitetura

- lógica de domínio concentrada fora da camada Telegram
- bot tratado como interface fina
- persistência por repositórios
- solução simples, robusta e expansível
- preservação das fases já implementadas sem regressões

## Objetivo do MVP atual

Antes de avançar para sistemas maiores, o projeto precisa entregar uma experiência mínima completa e coerente.

Isso significa:

- jogador criado e evoluível
- entrada no profissional
- partida jogável persistida
- multiplayer simples entre usuários
- identidade visual mínima funcional

## Fora de escopo do MVP atual

- temporada completa
- liga completa
- tabela
- mercado de transferências completo
- técnico usuário completo
- renderização gráfica avançada

## Organização recomendada da documentação

- `docs/current-phase.md`
- `docs/mvp-complete-before-phase3.md`
- `docs/multiplayer-mvp.md`
- `docs/visual-mvp.md`
- `docs/architecture.md`
- `docs/game-design.md`

## Observação

O TeleSoccer deve evoluir como produto jogável real, e não apenas como backend de simulação.