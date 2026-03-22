# Skill: deploy-smoke

## Objetivo
Executar fumaça de deploy compatível com Railway sem remover a execução por `dist`.

## Cobertura mínima
- `scripts/start.cjs` valida artefato antes do bootstrap
- app compilado sobe com `DATABASE_URL` configurado e Telegram desabilitado
- logs de startup informam commit, versão e estado do artefato

## Comandos úteis
- `DATABASE_URL=postgresql://test:test@localhost:5432/test node scripts/start.cjs`
- `node --test tests/deploy-smoke.test.js`
