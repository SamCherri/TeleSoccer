# TeleSoccer

TeleSoccer é um jogo de futebol online via bot do Telegram, com persistência em Prisma + PostgreSQL e deploy principal no Railway.

## Diretriz oficial do produto

O TeleSoccer agora está oficialmente definido como **jogo online centrado em jogadores humanos reais**.

Regra principal:
- humanos são o padrão para personagens controláveis e sessões online
- bots não são o padrão
- bots só existem como **fallback controlado** quando faltarem pessoas para completar fluxo, sala, elenco ou partida

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
- base pronta para distinguir humano e bot nas estruturas futuras de partida

### Multiplayer MVP
- criação de sala online persistida por jogador profissional humano
- entrada do segundo humano por código
- consulta do estado da sessão
- distinção explícita entre participante humano e bot
- marcação estrutural de vagas elegíveis para fallback com bot
- preparação da futura partida multiplayer compartilhada

### Visual MVP
- cards textuais de partida
- cards textuais de lobby multiplayer com foco em humanos primeiro

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
