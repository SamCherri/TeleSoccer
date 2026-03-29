---
name: railway-integration-debug
description: Audita e corrige falhas de integração entre WEB (Vite) e API (Fastify) no Railway para o TeleSoccer Web. Use quando houver erro de bootstrap no frontend, Failed to fetch, CORS bloqueado, API indisponível, variáveis de ambiente incorretas (VITE_API_URL, CORS_ORIGIN, DATABASE_URL, HOST, NODE_ENV) ou suspeita de rota não registrada.
---

# railway-integration-debug

Executar diagnóstico mínimo, nesta ordem:

1. Verificar bootstrap da API em `apps/api/src/main.ts`:
   - `HOST` e `PORT` no listen.
   - logs de startup e listen.
2. Verificar CORS em `apps/api/src/presentation/http/create-server.ts`:
   - parse de `CORS_ORIGIN` em CSV com `trim()`.
   - erro explícito em produção sem `CORS_ORIGIN`.
   - callback `origin` aceita ausência de Origin e bloqueia origem fora da whitelist.
3. Verificar URL base da WEB em `apps/web/src/infra/api/match-api.ts`:
   - produção depende de `VITE_API_URL` (sem fallback localhost).
   - timeout e erro de rede/CORS com mensagens claras.
4. Verificar rotas em `apps/api/src/presentation/http/routes/match-routes.ts`:
   - `POST /matches`
   - `GET /matches/:matchId/state`
   - `POST /matches/:matchId/join`
   - `POST /matches/:matchId/claim-slot`
   - `POST /matches/:matchId/actions`
   - `POST /matches/:matchId/advance`
5. Verificar dependência de banco em produção:
   - `apps/api/src/infra/repositories/create-match-repository.ts` exige `DATABASE_URL` em `NODE_ENV=production`.

Comandos de validação local recomendados:

```bash
npm run typecheck
./node_modules/.bin/tsx -e "process.env.NODE_ENV='production'; delete process.env.CORS_ORIGIN; process.env.DATABASE_URL='postgres://x:y@localhost:5432/db'; import('./apps/api/src/presentation/http/create-server.ts').then(m=>m.createServer()).catch(e=>console.error(e.message));"
./node_modules/.bin/tsx -e "process.env.NODE_ENV='production'; process.env.CORS_ORIGIN='https://telesoccer-web-production.up.railway.app'; delete process.env.DATABASE_URL; import('./apps/api/src/presentation/http/create-server.ts').then(m=>m.createServer()).catch(e=>console.error(e.message));"
```

Checklist Railway final:

- API:
  - `HOST=0.0.0.0`
  - `NODE_ENV=production`
  - `DATABASE_URL=<postgres railway>`
  - `CORS_ORIGIN=https://telesoccer-web-production.up.railway.app`
- WEB:
  - `VITE_API_URL=https://telesoccer-production.up.railway.app`

Critério de pronto:

- `/health` responde 200.
- frontend deixa de mostrar erro de conexão no bootstrap.
- requests de bootstrap (`POST /matches` e `GET /matches/:id/state`) completam com sucesso.
