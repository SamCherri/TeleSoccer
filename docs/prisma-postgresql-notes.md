# TeleSoccer - Notas de Prisma e PostgreSQL

Na Fase 1, algumas garantias críticas de consistência vivem **na migration SQL PostgreSQL**, e não apenas no `schema.prisma`.

## Por quê?
O Prisma modela a maior parte do domínio, mas **não representa integralmente índices únicos parciais** usados para proteger regras de banco importantes desta fase.

## Decisão técnica atual
Mantemos essas constraints diretamente na migration para garantir robustez real no banco:

- apenas **uma geração atual** por usuário
- apenas **um vínculo ativo** por jogador em `ClubMembership`

## Impacto para manutenção
Ao evoluir o schema da Fase 1, revise sempre também:

- `prisma/schema.prisma`
- `prisma/migrations/20260318120000_phase1_foundation/migration.sql`

Se uma alteração afetar essas invariantes, a migration PostgreSQL continua sendo a fonte necessária para preservar essas garantias.
