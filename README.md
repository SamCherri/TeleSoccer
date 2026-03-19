# TeleSoccer

TeleSoccer é um jogo de futebol online via bot do Telegram, com persistência em Prisma + PostgreSQL e deploy principal no Railway.

## Estado atual

O projeto está no **MVP completo pré-Fase 3** com quatro pilares ativos:

1. carreira base
2. partida jogável
3. multiplayer MVP
4. visual MVP

## O que já funciona

### Carreira base
- criação de jogador
- atributos iniciais
- treino semanal
- peneira
- entrada no profissional
- histórico e carteira

### Partida jogável
- partida por turnos no Telegram
- contexto do lance
- ações válidas por botão
- timeout de 30 segundos
- eventos, disciplina, energia e lesões

### Multiplayer MVP
- criação de sala multiplayer persistida
- entrada do segundo usuário por código
- consulta do estado da sala
- preparação da futura partida multiplayer

### Visual MVP
- cards textuais de partida
- cards textuais de lobby multiplayer

## Estrutura principal

- `prisma/` - schema e migrations
- `src/app/` - composição da aplicação
- `src/bot/` - dispatcher, facade e renderers do bot
- `src/domain/` - regras de negócio
- `src/infra/` - Prisma, Telegram e HTTP
- `docs/` - documentação funcional e técnica

## Comandos principais

```bash
npm run prisma:generate
npm run prisma:validate
npm run build
npm test
```

## Fluxos úteis no bot

- `/start` ou `/menu`
- `/treino`
- `/peneira`
- `/partida`
- `/lance`
- `/multiplayer`
- `/criar-sala`
- `/sala`
- `/entrar-sala CODIGO`

## Banco e deploy

- Persistência principal: PostgreSQL
- ORM: Prisma
- Ambiente principal: Railway

As variáveis de ambiente do deploy devem ser configuradas diretamente no Railway.
