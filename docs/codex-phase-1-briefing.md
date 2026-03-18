# TeleSoccer - Briefing para Codex - Fase 1

## 1. Objetivo

Implementar a **Fase 1 - Fundação jogável do jogador** no repositório do TeleSoccer.

O trabalho deve focar apenas no núcleo inicial da carreira do jogador.

---

## 2. Contexto obrigatório

Este projeto é um jogo de futebol via bot do Telegram.

Stack obrigatória:
- Node.js
- TypeScript
- Prisma
- PostgreSQL
- Railway

Diretrizes obrigatórias:
- respeitar a arquitetura atual do repositório
- respeitar a separação modular existente
- não remover funcionalidades existentes sem avisar
- não inventar sistemas gigantes fora da fase atual
- não acoplar regra de negócio ao Telegram
- não usar `.env` nas instruções finais de deploy

Documentos obrigatórios de referência:
- `AGENTS.md`
- `docs/game-rules.md`
- `docs/roadmap.md`
- `docs/current-phase.md`
- `docs/architecture.md`
- `docs/telegram-flows.md`
- `docs/backlog.md`

---

## 3. Escopo fechado

Implementar apenas o que é necessário para permitir que o usuário:

1. crie um jogador
2. veja sua ficha
3. faça treino individual semanal
4. tente uma peneira
5. possa falhar e tentar novamente
6. possa passar e entrar no profissional
7. tenha os dados persistidos corretamente

---

## 4. Regras de negócio obrigatórias

## 4.1 Jogador
- começa com 14 anos
- começa com atributos baixos
- escolhe nome
- escolhe nacionalidade
- escolhe posição principal
- escolhe pé dominante entre direito e esquerdo
- escolhe altura
- escolhe peso
- escolhe visual

## 4.2 Atributos
Os atributos iniciais devem ser influenciados por:
- posição
- altura
- peso

## 4.3 Treino semanal
- 1 treino individual por semana do jogo
- melhora 1 fundamento por vez
- custa dinheiro pessoal
- se a semana passar sem treino, a oportunidade é perdida
- não pode fazer 2 treinos na mesma semana

## 4.4 Peneira
- a tentativa de peneira custa dinheiro
- a taxa é fixa
- o jogador pode falhar
- se falhar, precisa treinar e tentar novamente
- se passar, entra no profissional

## 4.5 Entrada no profissional
- ao passar na peneira, o jogador deve ficar vinculado a um clube profissional
- o sistema pode usar clube gerado pelo sistema nesta fase, se necessário para completar o fluxo

---

## 5. Fora de escopo

Não implementar agora:
- partida por turnos
- técnico completo
- dono de clube
- contratos completos
- transferências
- empréstimos
- ligas completas
- temporadas completas
- seleções
- lesões em partida
- sistema tático completo
- entrosamento
- Premium completo

Se algo disso for necessário, deixar preparado de forma mínima, sem expandir além da fase.

---

## 6. Entidades mínimas esperadas

Sugestão mínima:

- User
- Player
- PlayerCareer
- PlayerAttribute
- Wallet
- TrainingSession
- TryoutAttempt
- Club
- ClubMembership

O nome exato pode variar conforme a base do repositório, mas a responsabilidade dessas entidades precisa existir.

---

## 7. Fluxos obrigatórios do bot

O bot deve conseguir executar:

## Fluxo 1 - Criação do jogador
- iniciar fluxo
- receber dados
- confirmar criação
- persistir jogador

## Fluxo 2 - Ficha do jogador
- carregar e exibir dados principais

## Fluxo 3 - Treino
- mostrar fundamentos disponíveis
- validar semana
- validar dinheiro
- aplicar treino
- mostrar resultado

## Fluxo 4 - Peneira
- validar dinheiro
- cobrar taxa
- registrar tentativa
- resolver resultado
- mostrar resultado

## Fluxo 5 - Entrada no profissional
- se aprovado na peneira, vincular a clube profissional
- registrar início da carreira profissional

---

## 8. Requisitos técnicos de implementação

## 8.1 Banco
- atualizar `schema.prisma`
- criar migration correspondente
- manter coerência com PostgreSQL

## 8.2 Código
- criar ou atualizar serviços de domínio
- criar ou atualizar repositórios
- criar ou atualizar handlers do bot
- não deixar lógica crítica espalhada em handlers

## 8.3 Documentação
Se houver mudança relevante de escopo técnico, atualizar os docs afetados.

---

## 9. Formato esperado da resposta do Codex

Ao concluir o trabalho, a resposta deve trazer:

1. resumo objetivo do que foi implementado
2. lista de arquivos criados ou alterados
3. impacto no banco
4. observações técnicas importantes
5. riscos ou pendências reais, se existirem

Se estiver respondendo em formato de arquivos para copiar:
- enviar caminho do arquivo fora do bloco
- enviar conteúdo completo do arquivo
- numerar os arquivos

---

## 10. Critérios de aceite

O trabalho só deve ser considerado correto quando:

1. o usuário conseguir criar jogador
2. os atributos iniciais forem aplicados
3. o treino semanal funcionar com custo e limite
4. a peneira funcionar com custo e resultado
5. o jogador puder falhar e tentar novamente
6. o jogador puder passar e entrar no profissional
7. a persistência estiver correta
8. os fluxos do bot estiverem conectados
9. a arquitetura continuar coerente com o projeto

---

## 11. Diretriz final para execução

Implemente a menor solução robusta possível para fechar a Fase 1.

Não reinvente o projeto.
Não avance para fases futuras sem necessidade.
Priorize:
- clareza
- robustez
- persistência correta
- separação de domínio
- compatibilidade com Telegram
- compatibilidade com Railway