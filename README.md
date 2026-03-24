# TeleSoccer

Base funcional inicial do TeleSoccer com:

- domínio de criação de jogador
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
- `POST /telegram/webhook`

## Deploy

Configurar no Railway:

- `PORT`
- `DATABASE_URL` (quando `STORAGE_DRIVER=prisma`)
- `STORAGE_DRIVER=prisma` para persistência PostgreSQL
