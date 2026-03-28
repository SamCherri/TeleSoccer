# ETAPA 4 — Validação de produção (API) + estratégia de deploy WEB

Este documento prepara a próxima etapa após o deploy inicial da API no Railway.

## 1) Diagnóstico rápido do estado atual

✅ Confirmado:
- Serviço no Railway sobe a API (`npm run start` na raiz chama `@telesoccer/api`).
- `GET /health` existe.
- 404 em `/` é esperado porque não há rota raiz.
- Endpoints principais de partida já estão expostos em rotas Fastify.

⚠️ Ponto de atenção antes de chamar de “produção validada”:
- O backend ainda possui fallback para `InMemoryMatchRepository` quando `DATABASE_URL` não está presente.
- Em ambiente de produção, `DATABASE_URL` precisa estar obrigatoriamente definido para garantir persistência real.

## 2) Checklist objetivo de validação manual (produção)

Use o domínio da API no Railway em `API_URL`.

### 2.1 Healthcheck

```bash
curl -i "$API_URL/health"
```

Esperado:
- HTTP `200`
- `data.status = "ok"`
- `data.service = "telesoccer-api"`

### 2.2 Criar partida

```bash
curl -i -X POST "$API_URL/matches" \
  -H "Content-Type: application/json" \
  -d '{"homeTeamName":"Azuis FC","awayTeamName":"Rubro United"}'
```

Esperado:
- HTTP `201`
- `data.matchState.matchId` preenchido
- Guardar `matchId` para os próximos testes

### 2.3 Consultar estado da partida

```bash
curl -i "$API_URL/matches/<matchId>/state"
```

Esperado:
- HTTP `200`
- Estado atual com `turnNumber`, `minute`, `currentEvent`, `availableActions`

### 2.4 Enviar ação do jogador

```bash
curl -i -X POST "$API_URL/matches/<matchId>/actions" \
  -H "Content-Type: application/json" \
  -d '{"action":"PASS"}'
```

Esperado:
- HTTP `200`
- Payload com `data.matchState` e `data.cycle`

### 2.5 Avançar turno

```bash
curl -i -X POST "$API_URL/matches/<matchId>/advance"
```

Esperado:
- HTTP `200`
- Payload com `data.matchState` e `data.cycle`

## 3) Gate mínimo para considerar API pronta para validação de produção

Marcar como pronto quando os itens abaixo forem verdadeiros no Railway:

1. `DATABASE_URL` configurado e apontando para PostgreSQL real.
2. Migrações aplicadas com `npm run prisma:deploy -w @telesoccer/api`.
3. 5 endpoints críticos respondendo conforme checklist acima.
4. CORS configurado para domínio do frontend (quando WEB for publicada).

## 4) Estratégia recomendada para publicar o frontend WEB

## Recomendação principal: **deploys separados (API e WEB)**

### Por que é a melhor opção aqui

- Mantém separação de responsabilidades (backend e frontend escalam/implantam de forma independente).
- Evita acoplamento do build web com runtime da API.
- Facilita rollback isolado (quebra de UI não derruba API).
- Alinha com a arquitetura atual em monorepo por apps (`apps/api` e `apps/web`).

### Topologia sugerida

- **Serviço 1 (Railway):** API (`@telesoccer/api`)
- **Serviço 2 (Railway):** WEB (`@telesoccer/web` em modo preview) ou plataforma de estático (Vercel/Netlify/Cloudflare Pages)

### Variáveis no frontend

- Definir `VITE_API_URL=https://<dominio-da-api>` no serviço WEB.
- Não embutir regra de negócio no frontend: UI apenas consome contratos da API existentes.

## 5) Próximo passo prático (sequência segura)

1. Confirmar `DATABASE_URL` no serviço API.
2. Rodar migrações em produção (`prisma:deploy`).
3. Executar checklist manual de 5 endpoints.
4. Criar serviço WEB separado e configurar `VITE_API_URL`.
5. Ajustar `CORS_ORIGIN` da API para o domínio final do WEB.
6. Fazer smoke test fim-a-fim no mobile (criar partida, ação, avanço, refresh).

---

Sem adicionar feature nova: este passo consolida estabilidade de produção e prepara publicação segura da interface web.
