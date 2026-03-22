# Matriz de riscos de qualidade e confiabilidade do TeleSoccer

## Objetivo
Mapear regressões capazes de deixar o bot mudo no Telegram, quebrar persistência relacional no Prisma ou promover artefato desatualizado no Railway.

## Superfícies críticas auditadas
- `src/infra/http/railway-telegram-server.ts`
- `src/infra/telegram/runtime.ts`
- `src/infra/telegram/client.ts`
- `src/bot/phase1-dispatcher.ts`
- `src/infra/prisma/match-repository.ts`
- `src/infra/prisma/multiplayer-repository.ts`
- `src/infra/prisma/player-repository.ts`
- `scripts/build.cjs`
- `scripts/start.cjs`
- `scripts/verify-artifact.cjs`
- `tests/`

## Matriz de falhas reais e blindagem
| Risco | Impacto operacional | Detecção/Blindagem |
| --- | --- | --- |
| Slash command quebrado | Jogador perde entrada principal do bot | Testes de normalização do dispatcher para `/start`, `/Start`, `/START` e menções ao bot |
| Dispatcher sem normalizar `/Start`, `/START` ou `/comando@Bot` | Compatibilidade de comandos falha em clientes variados | Skill `telegram-command-regression` + testes dedicados |
| Webhook inválido retornando status errado | Telegram reenvia update ou mascara problema real | Testes HTTP para `400`, `401` e `500` |
| Erro interno mascarado como `invalid-json` | Triagem incorreta e perda de causa raiz | Testes separados para parse inválido e exceção real |
| Runtime engolindo exceção | Bot fica mudo sem falhar visivelmente | Teste garante propagação de erro de `sendMessage` |
| Cliente Telegram sem log suficiente | Difícil correlacionar falha com chat/comando | Logs estruturados em runtime e cliente |
| Prisma `create` relacional com FK crua no lugar de `connect` | Erro recorrente de relação obrigatória em produção | Auditoria textual e testes de repositório |
| `src` corrigido e `dist` desatualizado | Railway sobe código velho | `inputHash`, `distHash` e `verify-artifact` rígido |
| Railway subindo artefato velho | Deploy aparentemente saudável com runtime antigo | `start` recusa artefato inválido |
| Próximo turno quebrando em `matchTurn.create` | Partida trava após resolução do lance | Teste de Prisma para `match: { connect: { id: matchId } }` |
| Fluxo de partida expirada quebrando o bot | Usuário perde continuidade de partida | Cobertura mantida pela suíte funcional existente + regressão de runtime |
| Webhook registrado diferente da URL pública final | Telegram entrega updates no endereço errado | Debug HTTP expõe `registeredWebhookUrl`, `finalWebhookUrl` e `urlsMatch` |

## Prioridade operacional
1. Impedir bot mudo.
2. Impedir erro Prisma relacional recorrente.
3. Impedir `dist` velho em produção.
4. Aumentar cobertura dos fluxos críticos.
