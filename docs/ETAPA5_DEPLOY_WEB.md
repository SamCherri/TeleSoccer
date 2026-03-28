# ETAPA 5 — Publicação do frontend WEB

## Objetivo da etapa

Publicar o `apps/web` como serviço web separado, mantendo a API já ativa no Railway estável e desacoplada.

> Esta etapa é de **deploy/publicação do frontend**, não de implementação de feature nova de gameplay.

---

## 1) Diagnóstico técnico do estado atual do frontend

### 1.1 `apps/web/package.json`

- Build definido corretamente: `tsc -p tsconfig.json && vite build`.
- Preview local definido: `vite preview --host 0.0.0.0 --port ${PORT:-4173}`.
- Scripts estão adequados para pipeline de CI/CD em serviço web separado.

### 1.2 `apps/web/vite.config.ts`

- `server.host` e `preview.host` em `0.0.0.0` (compatível com containers).
- Porta parametrizada por `PORT` para ambientes de deploy.
- Configuração atual suporta execução local e preview em ambiente Railway.

### 1.3 `apps/web/src/main.tsx` e `apps/web/src/App.tsx`

- Bootstrap simples do React (`createRoot` + `StrictMode`).
- `App` renderiza `MatchPage` sem acoplamento indevido no bootstrap.

### 1.4 `apps/web/src/infra/api/match-api.ts`

- Integração já usa `VITE_API_URL` com fallback local.
- Base URL agora normalizada para evitar erro de barra dupla (`//`) quando variável terminar com `/`.
- Contratos de API existentes são reutilizados sem duplicar regra de domínio no frontend.

### 1.5 `apps/web/src/state/match-ui-store.ts`

- Store somente orquestra chamadas assíncronas e estado de UI.
- Não contém regra de negócio de resolução de jogadas.
- Trata erro de API e já fornece mensagem amigável quando backend falha.

### 1.6 Bloqueadores para deploy separado

- Não há bloqueador de arquitetura para deploy separado.
- Dependência operacional principal: definir `VITE_API_URL` no serviço WEB apontando para a API publicada.
- Dependência de integração cruzada: configurar `CORS_ORIGIN` na API com domínio final do frontend.

---

## 2) Estratégia oficial recomendada de deploy

## Recomendação: **API e WEB em serviços separados**

### Opção recomendada (oficial)

- **API**: manter no Railway (serviço atual, sem mudanças de rota/contrato).
- **WEB**: novo serviço separado.
  - Pode ser no Railway (serviço dedicado do `apps/web`) **ou** plataforma estática (Vercel/Netlify/Cloudflare Pages).

### Justificativa técnica

1. Mantém desacoplamento entre backend e frontend.
2. Permite rollback isolado da interface sem derrubar API.
3. Evita gambiarra de servir SPA pela API Fastify.
4. Preserva arquitetura limpa e escalável para futura evolução multiplayer.

### Decisão prática recomendada

- Se prioridade for simplicidade operacional no curto prazo: **Railway separado para WEB**.
- Se prioridade for custo/performance de conteúdo estático global: **Vercel/Netlify/Cloudflare Pages**.

Para o estado atual do TeleSoccer, a recomendação oficial desta etapa é:

> **Criar serviço WEB separado no Railway primeiro**, validar integração fim-a-fim, e opcionalmente migrar depois para plataforma estática.

---

## 3) Variáveis de ambiente necessárias

### Serviço WEB

- `VITE_API_URL=https://<dominio-da-api-railway>`
- `PORT` (fornecida automaticamente pelo Railway; local usa padrão do Vite/preview)

### Serviço API

- `CORS_ORIGIN=https://<dominio-final-do-frontend>`
  - Se houver múltiplos domínios, separar por vírgula.

> Não usar `.env` versionado no repositório como premissa operacional de produção.

---

## 4) Comandos oficiais do frontend

### Build

```bash
npm run build -w @telesoccer/web
```

### Preview local (simulando execução do artefato)

```bash
npm run preview -w @telesoccer/web
```

> Observação: para a fase atual de validação operacional, usar `vite preview` no deploy é aceitável; para longo prazo, avalie hosting estático dedicado como solução final.

---


## 4.1) Configuração prática do serviço WEB no Railway

Ao criar o serviço do frontend no Railway, usar os parâmetros abaixo:

- **Root Directory:** `apps/web`
- **Build Command:** `npm run build`
- **Start Command:** `npm run preview -- --host 0.0.0.0 --port $PORT`
- **Variável obrigatória:** `VITE_API_URL=https://<dominio-da-api>`

> Essa configuração mantém o deploy do WEB separado da API e evita acoplamento indevido.

### Campos exatos para preencher no Railway (mobile)

- **Root Directory**
  - `apps/web`
- **Build Command**
  - `npm run build`
- **Start Command**
  - `npm run preview -- --host 0.0.0.0 --port $PORT`
- **Variable**
  - `VITE_API_URL=https://SEU-DOMINIO-DA-API`

---

## 5) Checklist de publicação (ETAPA 5)

1. Criar serviço WEB separado.
2. Configurar root/build/start do WEB (build + preview).
3. Definir `VITE_API_URL` no serviço WEB para a URL pública da API.
4. Publicar WEB e validar carregamento inicial.
5. Ajustar `CORS_ORIGIN` da API com domínio final do WEB.
6. Revalidar fluxo completo no frontend publicado.

---

## 6) Checklist de smoke test em produção

1. Abrir home do web app publicado.
2. Confirmar carregamento inicial sem erro fatal.
3. Criar partida (`POST /matches` via UI).
4. Buscar estado da partida (`GET /matches/:matchId/state` via fluxo da UI).
5. Enviar ação (`POST /matches/:matchId/actions`).
6. Avançar turno (`POST /matches/:matchId/advance`).
7. Dar refresh na tela e validar continuidade da integração com API.
8. Simular indisponibilidade da API e validar erro amigável no frontend.

---

## 7) Como apontar o frontend para a API publicada

1. No serviço WEB, definir:
   - `VITE_API_URL=https://<dominio-da-api>`
2. Fazer novo deploy do WEB após alterar variável.
3. Confirmar no browser (Network) que as chamadas saem para o domínio da API publicado.

---

## 8) Como configurar CORS na API para o domínio final do frontend

1. No serviço API (Railway), configurar `CORS_ORIGIN` com o domínio do WEB.
2. Se houver ambientes múltiplos (preview/prod), informar lista separada por vírgula.
3. Redeploy da API após ajuste de variável.
4. Validar no browser se preflight e requests `GET/POST` estão liberados.

---

## 9) Riscos conhecidos e próximos passos

### Riscos conhecidos

- `VITE_API_URL` ausente/incorreta => frontend chama endpoint errado.
- `CORS_ORIGIN` incompleto => bloqueio de requests no navegador.
- API sem `DATABASE_URL` em produção => comportamento sem persistência real.

### Próximos passos após ETAPA 5

1. Publicar serviço WEB separado e concluir smoke tests.
2. Consolidar observabilidade mínima (logs de API e erros de frontend).
3. Definir política de promoção entre ambientes (staging -> produção).

---

ETAPA 5 concluída no escopo de documentação e preparação operacional: sem alterações de gameplay e sem alterações de contrato da API.
