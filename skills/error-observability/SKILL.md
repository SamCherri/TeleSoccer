# Skill: error-observability

## Objetivo
Garantir que falhas críticas tenham status HTTP correto e logs estruturados suficientes para triagem.

## Cobertura mínima
- runtime propaga falha de `sendMessage`
- logs incluem `updateId`, `chatId`, `fromId` e `command`
- cliente Telegram registra início/sucesso/falha de chamadas críticas
- servidor HTTP não mascara erro interno como `invalid-json`

## Comandos úteis
- `npm test -- tests/error-observability.test.js`
- `node --test tests/error-observability.test.js`
