# TeleSoccer

Base funcional inicial do TeleSoccer com:

- domínio de criação de jogador
- login/logout básico com sessão em memória
- repositório em memória e repositório Prisma/PostgreSQL
- servidor HTTP compatível com Railway
- endpoint de webhook para comandos do Telegram

## Executar localmente

```bash
npm install
npm start
```

Endpoints:

- `GET /health`
- `GET /players`
- `POST /players`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session?telegramUserId=<id>`
- `POST /telegram/webhook`

Comandos Telegram:

- `/start`
- `/criar_jogador <nome> <posicao> <pais>`
- `/login`
- `/logout`

## Deploy

Configurar no Railway:

- `PORT`
- `DATABASE_URL` (quando `STORAGE_DRIVER=prisma`)
- `STORAGE_DRIVER=prisma` para persistência PostgreSQL
