# Skill: artifact-consistency

## Objetivo
Garantir que `src`, `dist` e metadados de build permaneçam sincronizados para deploy por artefato no Railway.

## Cobertura mínima
- build registra `inputHash` e `distHash`
- `verify-artifact` falha quando `src` e `dist` divergem
- `start` recusa subir artefato inválido
- detecção de `dist` antigo ou arquivo ausente

## Comandos úteis
- `npm run build`
- `npm run verify:artifact`
- `node --test tests/artifact-consistency.test.js`
