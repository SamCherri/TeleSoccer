# Skill: telegram-command-regression

## Objetivo
Blindar regressões do dispatcher, webhook HTTP e compatibilidade operacional dos slash commands do TeleSoccer.

## Cobertura mínima
- `/start`, `/Start`, `/START`
- comandos com menção ao bot, como `/start@TeleSoccerBot`
- normalização de comandos antes do facade
- `invalid-json` retornando `400`
- segredo inválido retornando `401`
- erro interno real retornando `500`
- debug de webhook exibindo divergência entre URL registrada e `finalWebhookUrl`

## Comandos úteis
- `npm test -- tests/telegram-command-regression.test.js`
- `node --test tests/telegram-command-regression.test.js`
