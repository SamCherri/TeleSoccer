# TeleSoccer

TeleSoccer é um jogo de futebol online via bot do Telegram. O projeto continua com Prisma + PostgreSQL + Railway como base oficial, mas agora o MVP estrutural também inclui uma camada multiplayer humano-first e uma apresentação visual textual mais forte, alinhada ao conceito de jogo online.

## Estado atual do produto

A base já entrega, sem quebrar Fase 1 e Fase 2:

- criação conversacional de jogador
- ficha, carreira, treino semanal, carteira e peneira
- partida solo por turnos com persistência, energia, cartões, lesões e eventos
- sessão multiplayer com dois lados (`HOME` e `AWAY`)
- múltiplos jogadores humanos por sessão
- titulares e reservas por lado
- mistura de humanos e bots, com bots usados apenas como fallback elegível em slots marcados
- renderização de cards visuais de sessão, elencos, preparação de confronto e partida
- estrutura pronta para evoluir até 11x11 + reservas e partida compartilhada
- runtime pronto para Railway com Telegram Bot API

## Comandos principais do bot

### Carreira e partida
- `/start`
- `/menu`
- `/ficha`
- `/carreira`
- `/historico`
- `/carteira`
- `/treino`
- `/peneira`
- `/partida`
- `/lance`

### Multiplayer humano-first
- `/multiplayer`
- `/criar-sala`
- `/sala`
- `/sala CODIGO`
- `/entrar-sala CODIGO HOME TITULAR`
- `/entrar-sala CODIGO AWAY RESERVA`
- `/preparar-sala`
- `/preparar-sala CODIGO`

## Arquitetura multiplayer MVP

A PR atual abandona a mentalidade de “host + segundo jogador” e passa a modelar o fluxo como **sessão com dois elencos**.

### Conceitos persistidos
- `MultiplayerSession`
- `MultiplayerSessionParticipant`
- `MultiplayerTeamSide`
- `MultiplayerParticipantKind`
- `MultiplayerSquadRole`
- `MultiplayerSessionStatus`
- `MultiplayerSessionFillPolicy`

### Regras-chave
- criar, entrar, consultar e preparar sala exige jogador profissional
- `/sala CODIGO` pode ser consultado por qualquer jogador profissional que tenha o código; `/sala` sem código continua representando a sala atual do participante
- cada humano ocupa um lado e uma vaga de elenco
- cada lado suporta titulares e reservas
- bots só entram como fallback, nunca como padrão
- o fallback usa slots explicitamente marcados e só é liberado quando o mínimo humano já foi atingido
- somente o host prepara a sala nesta etapa, o que move a sessão para preparação de confronto
- a base já prepara a ligação futura com `Match`

## Camada visual MVP

O TeleSoccer agora possui renderers e view models dedicados para:

- card de sessão multiplayer
- card de elenco por lado
- card de preparação de confronto
- card de partida com identidade mais forte

A regra de negócio continua no domínio; a apresentação fica em `src/view-models/` e `src/presentation/`.

## Stack oficial

- Node.js 20+
- TypeScript
- Prisma
- PostgreSQL
- Railway
- Telegram Bot API

## Scripts

- `npm run build`
- `npm start`
- `npm test`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:migrate:deploy`

## Variáveis de ambiente esperadas no Railway

Configure diretamente no painel do Railway:

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma
- `TELEGRAM_BOT_TOKEN`: token do BotFather
- `APP_BASE_URL`: URL pública HTTPS da aplicação no Railway
- `TELEGRAM_WEBHOOK_SECRET`: segredo usado no path do webhook e na validação do header `X-Telegram-Bot-Api-Secret-Token`
- `PORT`: porta HTTP exposta pelo Railway
- `NODE_ENV`: `production`

## Deploy no Railway

1. Provisione PostgreSQL no Railway e conecte `DATABASE_URL` ao serviço da aplicação.
2. Configure `TELEGRAM_BOT_TOKEN`, `APP_BASE_URL`, `TELEGRAM_WEBHOOK_SECRET`, `PORT` e `NODE_ENV` diretamente no serviço.
3. Garanta que o deploy execute `npm install` para acionar `prisma generate`.
4. Rode `npm run prisma:migrate:deploy` no release/deploy command.
5. Inicie a aplicação com `npm start`.
6. O TeleSoccer registra automaticamente o webhook em `APP_BASE_URL/telegram/webhook/TELEGRAM_WEBHOOK_SECRET`.
7. Use `GET /health` como healthcheck do Railway.
