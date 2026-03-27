---
name: pr-review-telesoccer
description: Revisa diffs e pull requests do TeleSoccer Web com foco em consistência arquitetural, promessas implementadas, riscos de acoplamento, duplicação de contratos, aderência ao jogo por cenas e maturidade real entre README e código.
---

# pr-review-telesoccer

## Nome da skill

`pr-review-telesoccer`

## Objetivo

Executar revisão técnica rigorosa de PRs para reduzir retrabalho e detectar regressões arquiteturais cedo.

## Quando usar

- Sempre antes de merge em mudanças de feature/refactor.
- Quando README, arquitetura e implementação evoluem juntos.
- Quando há mudanças simultâneas em API + Web + Prisma.

## Quando não usar

- Commits triviais de documentação sem impacto técnico.
- PR experimental sem intenção de integração.

## Entradas esperadas

- Diff completo do PR.
- Objetivo declarado do PR.
- Arquivos alterados por camada.
- Resultado de checks/testes disponíveis.

## Saídas obrigatórias

1. Parecer técnico categorizado por severidade:
   - bloqueante
   - alta
   - média
   - baixa
2. Lista de divergências entre promessa e entrega real.
3. Decisão final: **APROVAR** ou **SOLICITAR AJUSTES**.
4. Lista objetiva de correções mínimas para aprovação.

## Regras obrigatórias

1. Verificar coerência entre README e implementação real.
2. Verificar separação de camadas no backend.
3. Verificar ausência de regra de jogo no frontend.
4. Verificar persistência de campos críticos em `Match` e `MatchEvent`.
5. Verificar se `recentEvents` é alimentado de verdade.
6. Verificar risco de duplicação de contrato API/Web (registrar como débito técnico quando aplicável).

## Critérios de bloqueio

- PR afirma arquitetura limpa, mas mantém lógica concentrada em rota/main.
- PR afirma persistência, mas dados continuam apenas em memória sem fallback explícito.
- PR afirma UI de jogo por cenas, mas entrega layout genérico sem card de cena.
- PR adiciona comportamento crítico sem validação mínima.

## Critérios de aprovação

- Entrega está alinhada ao objetivo declarado do PR.
- Não há violações arquiteturais bloqueantes.
- Débitos técnicos remanescentes estão explícitos e controlados.
- Testes/checks básicos foram executados e reportados com transparência.

## Erros comuns que a skill deve evitar

- Aprovar PR pela qualidade de escrita do README.
- Ignorar campos obrigatórios de persistência por “etapa futura”.
- Tratar warnings de execução como se fossem sucesso total.

## Sinais de implementação fraca

- “README mais maduro que o código”.
- Classes com responsabilidade múltipla não justificada.
- Diferença grande entre contrato descrito e payload real retornado.

## Sinais de implementação aceitável

- Objetivo do PR claramente refletido no código.
- Fluxo crítico executável ponta a ponta (mesmo com escopo MVP).
- Débitos técnicos bem delimitados sem mascarar falhas reais.

## Checklist de validação

- [ ] Objetivo do PR foi realmente implementado.
- [ ] Arquitetura por camadas preservada.
- [ ] Persistência e contrato estão coerentes.
- [ ] UI está alinhada ao produto de jogo por cenas.
- [ ] Riscos remanescentes estão documentados com plano.

## Exemplo de uso (TeleSoccer)

**Entrada:** “Revisar PR da ETAPA 3 com Prisma.”

**Aplicação da skill:**

1. Conferir se `schema.prisma` contém todas entidades obrigatórias.
2. Conferir se rota chama serviço de aplicação e não Prisma direto.
3. Conferir se `recentEvents` vem de histórico real.
4. Conferir divergências entre descrição do PR e arquivos alterados.

**Saída esperada:**

Parecer objetivo com bloqueios reais e lista acionável para aprovação final.
