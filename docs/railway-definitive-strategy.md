# Estratégia definitiva de integração Railway (WEB ↔ API) — TeleSoccer

## 1) Diagnóstico do erro mostrado na imagem

Pelo log do Railway, o deploy falhou na fase de build da API com:

- `error TS2451: Cannot redeclare block-scoped variable`
- arquivo: `src/presentation/http/create-server.ts`

Isso indica conflito de código no arquivo de bootstrap HTTP (variáveis/constantes duplicadas após patch parcial ou merge), impedindo a API de compilar e publicar. Sem API publicada, o frontend em produção apresenta erro de conexão (`Failed to fetch` / `Não foi possível conectar à API`).

## 2) Estratégia profissional e definitiva (sem gambiarra)

### Pilar A — Build determinístico (bloqueio de regressão)

1. Tornar obrigatório no fluxo de PR:
   - `npm run typecheck`
   - `npm run build -w @telesoccer/api`
   - `npm run build -w @telesoccer/web`
2. Só permitir merge com os três comandos verdes.
3. Manter `create-server.ts` como ponto único de configuração CORS (evita duplicação em múltiplos arquivos).

### Pilar B — Contrato de ambiente explícito no Railway

#### API (service: telesoccer-production)
- `HOST=0.0.0.0`
- `NODE_ENV=production`
- `DATABASE_URL=<postgres railway>`
- `CORS_ORIGIN=https://telesoccer-web-production.up.railway.app`

#### WEB (service: telesoccer-web-production)
- `VITE_API_URL=https://telesoccer-production.up.railway.app`

Regra operacional:
- Sem `CORS_ORIGIN` em produção: API deve falhar no bootstrap com erro claro.
- Sem `VITE_API_URL` no frontend de produção: WEB deve falhar com mensagem clara.

### Pilar C — CORS robusto e auditável

No backend Fastify:
1. `CORS_ORIGIN` em CSV (`split(',')`, `trim()`, remove vazios).
2. Callback de origem:
   - aceita requests sem `Origin` quando apropriado (healthchecks/server-to-server);
   - aceita apenas origens na whitelist;
   - rejeita demais com erro `Origin não permitida: ...`.
3. Métodos permitidos: `GET`, `POST`, `OPTIONS`.

### Pilar D — Observabilidade mínima para incidentes

Logar no bootstrap da API (sem segredos):
- `nodeEnv`
- `hasDatabaseUrl` (boolean)
- `allowedOrigins`
- `host`/`port` de listen

Com isso, em 30 segundos de logs é possível separar:
- API não subiu,
- CORS bloqueou,
- WEB apontando para URL errada.

### Pilar E — Runbook de validação pós-deploy (celular)

1. Abrir `https://telesoccer-production.up.railway.app/health` e confirmar 200.
2. Abrir WEB em produção no celular.
3. Validar bootstrap sem erro de conexão:
   - `POST /matches`
   - `GET /matches/:matchId/state`
4. Validar fluxo interativo:
   - `POST /matches/:matchId/join`
   - `POST /matches/:matchId/claim-slot`
   - `POST /matches/:matchId/actions`
   - `POST /matches/:matchId/advance`
5. Se falhar:
   - revisar variáveis Railway;
   - revisar logs de bootstrap (`startup-config` e `listen-config`).

## 3) Plano de prevenção contínua

1. Checklist obrigatório de release Railway (API + WEB).
2. Template de PR com seção fixa: “Variáveis de produção impactadas”.
3. Um único responsável por alterações de bootstrap/CORS por ciclo de release para evitar patches concorrentes em `create-server.ts`.
4. Auditoria rápida após cada merge:
   - build local do workspace API,
   - smoke de `/health` em ambiente publicado.

## 4) Resultado esperado

Aplicando esta estratégia, o problema deixa de ser recorrente porque:
- o erro de compilação é barrado antes do deploy,
- CORS e env ficam com contrato explícito,
- incidentes passam a ter diagnóstico rápido com logs objetivos,
- e o fluxo mobile-first do jogo continua sem mover regra de negócio para frontend.
