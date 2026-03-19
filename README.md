# TeleSoccer

TeleSoccer é um jogo de futebol via bot do Telegram. A Fase 1 entrega o núcleo inicial da carreira do jogador com persistência em PostgreSQL via Prisma e runtime pronto para Railway.

## Fase 1 concluída

A base atual cobre:
- criação conversacional de jogador
- ficha do jogador
- treino semanal com custo, ganho e bloqueio por semana
- peneira com reprovação/aprovação e promoção ao profissional
- histórico da carreira persistido
- carteira pessoal com extrato
- status da carreira
- dispatcher central do bot
- persistência da conversa de criação com expiração por inatividade
- runtime real do Telegram via webhook HTTP para Railway com validação do secret token do Telegram
- rejeição de payload inválido e tratamento explícito de updates ignorados pelo runtime

## Stack

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
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:migrate:deploy`

## Variáveis de ambiente esperadas no Railway

Configure diretamente no painel do Railway:

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma
- `TELEGRAM_BOT_TOKEN`: token do BotFather
- `APP_BASE_URL`: URL pública HTTPS da aplicação no Railway
- `TELEGRAM_WEBHOOK_SECRET`: segredo usado no path do webhook e na validação do header `X-Telegram-Bot-Api-Secret-Token` (se omitido fora do Railway, o servidor usa `telesoccer-phase1` como fallback local)
- `PORT`: porta HTTP exposta pelo Railway
- `NODE_ENV`: `production`

## Deploy no Railway

1. Provisione PostgreSQL no Railway e conecte `DATABASE_URL` ao serviço da aplicação.
2. Configure as variáveis `TELEGRAM_BOT_TOKEN`, `APP_BASE_URL`, `TELEGRAM_WEBHOOK_SECRET`, `PORT` e `NODE_ENV`.
3. Garanta que o deploy execute `npm install` para acionar `prisma generate`.
4. Rode `npm run prisma:migrate:deploy` no release/deploy command.
5. Inicie a aplicação com `npm start`.
6. Na inicialização, o TeleSoccer registra automaticamente o webhook em `APP_BASE_URL/telegram/webhook/TELEGRAM_WEBHOOK_SECRET` e envia o mesmo valor como secret token do webhook.
7. `POST /telegram/webhook/:secret` responde `200 accepted` para updates processados, `202 ignored` quando o payload é válido mas não gera ação de bot, `400 invalid-json` para JSON inválido, `400 invalid-payload` para JSON estruturalmente incompatível e `401 unauthorized` para secret token incorreto.
8. Use `GET /health` para healthcheck do Railway.

## Runtime do bot

O entrypoint `src/app/index.ts` sobe um servidor HTTP mínimo para Railway e recebe updates do Telegram via webhook. Cada update é encaminhado ao dispatcher da Fase 1, que responde com mensagens e teclado simples compatível com o Telegram.
