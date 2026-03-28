# ETAPA 6 — MVP vertical slice jogável (TeleSoccer Web)

## 1) Objetivo desta etapa

Iniciar oficialmente a fase de MVP do TeleSoccer Web com o menor recorte **realmente jogável** no navegador/mobile que valide a regra principal do produto:

- 1 partida suporta 22 jogadores em campo (11 por time);
- cada vaga de jogador pode ser controlada por usuário real ou bot;
- vagas sem usuário ficam com bot;
- backend resolve turnos e eventos;
- frontend não decide resultado da jogada.

---

## 2) Diagnóstico atual frente ao MVP

## 2.1 O que já existe e pode ser reaproveitado

1. **Arquitetura em camadas no backend** (`domain/application/infra/presentation/shared`) já está estabelecida.
2. **Pipeline de turno/evento no backend** já existe e já retorna estado jogável para a UI.
3. **Persistência Prisma/PostgreSQL com repositório** já está disponível (com fallback in-memory quando não há `DATABASE_URL`).
4. **Frontend mobile-first básico** já renderiza HUD/cena/feed e envia ação para API.
5. **Contrato de estado de partida** já permite experiência jogável de turno por cenas.

## 2.2 O que falta para provar o modelo oficial no MVP

1. **Garantia de 22 vagas titulares por partida** (`MatchLineup`) no fluxo de criação.
2. **Vínculo opcional vaga -> usuário controlador** em nível de slot/jogador.
3. **Estado de controle por vaga (HUMAN/BOT)** persistido e consultável.
4. **Caso de uso de entrada de usuário na partida**.
5. **Caso de uso de claim de vaga específica**.
6. **Resolução de turno com participantes relevantes vinculados à vaga**.
7. **Fallback simples para bot** quando não houver usuário controlador ativo.
8. **UI de lineup/slots com indicador HUMAN/BOT + fluxo de join/claim**.
9. **Exibir ação pendente apenas quando o jogador do usuário participar do lance**.

Conclusão objetiva: a base atual está pronta para evoluir para o MVP, mas o recorte multiplayer por jogador ainda não está implementado.

---

## 3) Definição objetiva do MVP (vertical slice)

O MVP desta etapa será considerado válido quando provar, em fluxo ponta a ponta (API + DB + Web), que:

1. uma partida nasce com 22 vagas titulares;
2. as 22 vagas iniciam em BOT;
3. usuário entra na partida e assume 1 vaga específica;
4. backend identifica participantes do lance;
5. se o jogador do usuário participa, a UI libera ação para esse usuário;
6. se não houver usuário (ou houver ausência/timeout simples), bot resolve;
7. tudo isso roda em experiência mobile-first jogável.

---

## 4) Escopo obrigatório do MVP

## 4.1 Backend

Implementar somente o necessário para validar o loop principal:

- modelagem mínima para 22 slots titulares;
- vínculo opcional entre vaga e usuário controlador;
- controle HUMAN/BOT por vaga;
- criação de partida já com 22 vagas;
- caso de uso de entrada na partida;
- caso de uso de claim de vaga;
- resolução de turno por participantes relevantes;
- fallback simples para bot quando não houver usuário;
- persistência real com Prisma/PostgreSQL.

## 4.2 Frontend

- tela mobile-first;
- exibição de cena atual;
- exibição de placar/minuto/feed;
- exibição de lineup/slots com indicador HUMAN/BOT;
- ação para entrar na partida e assumir vaga;
- exibir ação pendente apenas quando o jogador do usuário estiver no lance;
- loading/erro simples e funcional.

---

## 5) Fora do MVP (não implementar nesta etapa)

- banco/reservas/substituições;
- matchmaking complexo;
- chat;
- economia/carreira;
- temporada;
- reconexão avançada;
- coordenação perfeita de 22 humanos;
- features cosméticas extras.

---

## 6) Backlog mínimo do MVP

## BL-01 — Persistência de 22 slots titulares

- Evoluir `MatchLineup` para suportar `slotNumber` e controle por vaga.
- Garantir `11 HOME + 11 AWAY` por partida no create.

## BL-02 — Controle por vaga (HUMAN/BOT)

- Adicionar campos mínimos de controle (`controlMode`, `controllerUserId`, status básico).
- Leitura rápida do estado de controle por partida.

## BL-03 — Entrada e presença básica do usuário

- Caso de uso `joinMatch` (registro de presença simples na partida).
- Sem reconexão avançada nesta etapa.

## BL-04 — Claim de vaga

- Caso de uso `claimLineupSlot` com validação de slot disponível.
- Garantir 1 usuário por vaga e consistência transacional.

## BL-05 — Turno com participantes relevantes

- Motor define participantes do lance em nível de vaga/jogador.
- Aplicação identifica quem precisa agir.

## BL-06 — Fallback simples para bot

- Se vaga sem humano ativo, ação é resolvida por bot.
- Timeout/ausência simples (sem orquestração avançada de sessão).

## BL-07 — API mínima do slice

- Endpoints para:
  - criar partida;
  - entrar na partida;
  - claim de vaga;
  - consultar estado (incluindo lineup/controladores);
  - enviar ação quando aplicável.

## BL-08 — UI mobile do slice

- Painel de lineup com estado HUMAN/BOT por slot.
- Ação de entrar/claim.
- Painel de ação condicionado ao envolvimento do jogador do usuário.

## BL-09 — Critérios de aceite do MVP

- Cenário A: 0 humanos (100% bot) jogável;
- Cenário B: humano assume 1 vaga e participa de lance;
- Cenário C: humano ausente e bot assume fallback simples.

---

## 7) Sequência mínima de implementação (ordem recomendada)

1. **Dados primeiro**: ajustar schema Prisma + migração para 22 slots/controladores.
2. **Repositórios**: leitura/escrita de lineup e controle por vaga.
3. **Casos de uso**: `createMatchWithLineup`, `joinMatch`, `claimLineupSlot`.
4. **Turno híbrido**: integrar participantes relevantes + fallback bot simples.
5. **Rotas HTTP**: expor contratos mínimos do MVP.
6. **Web mobile**: lineup/claim + ação condicional por participante.
7. **Teste de fluxo ponta a ponta**: cenários A/B/C.
8. **Checklist de release MVP**: pronto para deploy Railway.

---

## 8) Guardrails arquiteturais obrigatórios desta etapa

- Manter separação real entre `domain/application/infra/presentation`.
- Não colocar regra de jogo no React.
- Não centralizar regra de domínio em rotas HTTP.
- Repositórios apenas persistem/consultam; aplicação orquestra.
- Contratos API devem refletir estado real do backend (sem “promessa fake”).

---

## 9) Reaproveitamento e descarte nesta etapa

## 9.1 Reaproveitar

- pipeline de turno/evento existente no backend;
- estrutura de repositório Prisma já implantada;
- UI de cena/HUD/feed já operacional;
- fluxo mobile-first já existente.

## 9.2 Descartar/adiar

- qualquer ambição fora do loop principal do MVP (chat, temporada, etc.);
- reconexão avançada e coordenação multiplayer completa;
- funcionalidades de banco/substituição.

Motivo: manter foco no menor vertical slice jogável que valida o modelo oficial.

---

## 10) Declaração oficial da ETAPA 6

A ETAPA 6 formaliza um **MVP vertical slice jogável**, não a versão final completa do produto.

Esse MVP valida tecnicamente o modelo oficial de 22 vagas titulares com controle híbrido humano/bot, preservando a arquitetura limpa e preparando evolução multiplayer futura.
