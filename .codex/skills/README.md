# TeleSoccer Web — Catálogo de Skills Internas

Este diretório centraliza skills operacionais para execução e revisão técnica do projeto TeleSoccer Web.

## Convenção de estrutura

- Pasta raiz: `.codex/skills/`
- Uma pasta por skill, em **kebab-case**.
- Cada skill contém obrigatoriamente um arquivo `SKILL.md`.

Exemplo:

```text
.codex/skills/
  architecture-guard/
    SKILL.md
  match-engine-builder/
    SKILL.md
```

## Convenção de nomes

- Nome da pasta: `kebab-case`, curto e orientado a ação.
- Nome interno da skill (frontmatter): igual ao nome da pasta.
- Descrição da skill: deve indicar claramente gatilhos de uso e escopo.

## Lista inicial de skills

1. `architecture-guard`
2. `match-engine-builder`
3. `prisma-modeling`
4. `scene-ui-mobile`
5. `pr-review-telesoccer`
6. `railway-integration-debug`

## Como acionar no fluxo

Use o nome da skill explicitamente no prompt de trabalho da etapa correspondente:

- `Use a skill architecture-guard para revisar esta implementação antes de commit.`
- `Aplique a skill match-engine-builder para implementar o próximo passo do motor de partida.`
- `Use prisma-modeling para revisar o schema e propor migração segura.`
- `Aplique scene-ui-mobile para construir a tela de partida em mobile-first.`
- `Use pr-review-telesoccer para revisar este PR com critérios de bloqueio.`

## Regra de uso combinada (recomendado)

Para mudanças de feature completas no TeleSoccer Web:

1. `architecture-guard` (trava arquitetural)
2. `match-engine-builder` ou `prisma-modeling` (núcleo da mudança)
3. `scene-ui-mobile` (quando houver impacto de UI)
4. `pr-review-telesoccer` (revisão final)

## Escopo das skills

As skills são especializadas no contexto do TeleSoccer Web:

- monorepo com workspaces
- `apps/api` e `apps/web`
- Fastify, React/Vite, Zustand
- Prisma/PostgreSQL
- deploy Railway
- produto de jogo por cenas (não bot, não dashboard)
