# TeleSoccer - Roadmap de Desenvolvimento

## 1. Objetivo do roadmap

Este roadmap organiza a construção do TeleSoccer em fases pequenas, seguras e expansíveis.

A regra principal é:

- não tentar construir o universo inteiro de uma vez
- sempre estabilizar a base antes de expandir

---

## 2. Princípios do roadmap

Cada fase deve entregar:

- valor jogável real
- regras de negócio bem definidas
- banco consistente
- integração mínima com o bot
- espaço para expansão sem retrabalho grande

Cada fase deve ser concluída com:

- documentação atualizada
- critérios de aceite claros
- impacto arquitetural controlado

---

## 3. Fase 1 - Fundação jogável do jogador

## Objetivo
Colocar o núcleo da carreira em funcionamento.

## Escopo
- cadastro de usuário
- criação de jogador
- atributos iniciais
- posição principal
- pé dominante
- altura e peso
- nacionalidade
- idade inicial de 14 anos
- pontos herdados de renascimento
- histórico básico do personagem
- dinheiro pessoal inicial
- treino individual semanal
- tentativa de peneira
- aprovação ou reprovação em peneira
- entrada no profissional
- vínculo inicial com clube profissional
- histórico mínimo de carreira

## Banco
Entidades candidatas:
- User
- Player
- PlayerCareer
- PlayerAttribute
- PlayerGeneration
- TryoutAttempt
- TrainingSession
- Wallet

## Bot Telegram
Fluxos:
- criar jogador
- ver ficha
- fazer treino
- entrar em peneira
- ver resultado da peneira
- ver status de carreira

## Critérios de aceite
- usuário consegue criar jogador
- jogador nasce corretamente com atributos baixos
- treino semanal funciona
- peneira pode ser tentada
- jogador pode falhar e tentar de novo pagando
- jogador pode passar e entrar no profissional

---

## 4. Fase 2 - Núcleo da partida por turnos

## Objetivo
Fazer partidas jogáveis no Telegram.

## Escopo
- estrutura de partida
- 2 tempos de 45
- turnos de 30 segundos
- posse
- contexto de lance
- ações simples por botão
- combinação de até 2 ações
- resultado imediato
- placar
- tempo de jogo
- acréscimos
- faltas
- pênaltis
- escanteios
- tiros de meta
- cartões
- suspensões
- energia física
- lesões
- goleiro controlável

## Banco
Entidades candidatas:
- Match
- MatchLineup
- MatchTurn
- MatchEvent
- MatchDisciplinaryEvent
- InjuryRecord
- SuspensionRecord

## Bot Telegram
Fluxos:
- entrar em partida
- receber contexto do lance
- escolher ação
- perder turno por tempo
- acompanhar placar
- acompanhar tempo

## Critérios de aceite
- partida roda de ponta a ponta
- usuário recebe lances coerentes
- o relógio de 30 segundos funciona
- cartões, faltas e pênaltis funcionam
- resultado de lance aparece no chat

---

## 5. Fase 3 - Contratos e mercado básico

## Objetivo
Dar estrutura profissional à carreira.

## Escopo
- contrato profissional
- salário mensal
- duração
- multa rescisória
- cláusulas extras
- renovação
- recusa de renovação
- pedido de transferência
- venda definitiva
- empréstimo
- retorno automático ao clube de origem

## Banco
Entidades candidatas:
- Contract
- ContractClause
- TransferRequest
- TransferDeal
- LoanDeal
- SalaryPayment

## Bot Telegram
Fluxos:
- ver proposta de contrato
- aceitar ou recusar
- pedir transferência
- visualizar empréstimo
- visualizar salário

## Critérios de aceite
- clube consegue ofertar contrato
- jogador vê tudo antes de aceitar
- salário mensal é pago
- transferência e empréstimo funcionam

---

## 6. Fase 4 - Técnico e camada tática

## Objetivo
Adicionar governança esportiva ao clube.

## Escopo
- papel de técnico
- formação tática
- estilo de jogo
- escalação
- substituições
- treino coletivo
- impacto tático nos lances
- instruções pré-jogo
- leitura do adversário por setor
- goleiro adversário e jogadores perigosos

## Banco
Entidades candidatas:
- CoachProfile
- TeamTactic
- FormationPreset
- TeamInstruction
- TeamTrainingPlan

## Bot Telegram
Fluxos:
- definir formação
- definir estilo
- escalar time
- fazer substituições
- programar treino coletivo

## Critérios de aceite
- técnico consegue escalar
- formação afeta o jogo
- estilo afeta contexto dos lances
- treino coletivo influencia desempenho e evolução

---

## 7. Fase 5 - Dono de clube e criação de clubes

## Objetivo
Liberar a camada de gestão de clube.

## Escopo
- papel de dono de clube
- Premium e segunda conta
- direito de clube
- criação de clube
- nome, escudo, cores e uniforme
- cidade e país
- entrada na divisão mais baixa
- geração de elenco inicial mínimo
- vagas para contratação
- contratação de técnico

## Banco
Entidades candidatas:
- Club
- ClubIdentity
- ClubOwner
- ClubCreationRight
- ClubBudget
- ClubRosterSlot

## Bot Telegram
Fluxos:
- criar clube
- configurar identidade
- visualizar elenco inicial
- contratar técnico

## Critérios de aceite
- dono consegue criar clube
- clube entra no país certo
- clube entra na série correta
- elenco inicial é gerado corretamente

---

## 8. Fase 6 - Ligas, temporadas e promoção/rebaixamento

## Objetivo
Estruturar o universo competitivo contínuo.

## Escopo
- séries nacionais
- calendário
- tabela
- pontos corridos
- promoção
- rebaixamento
- expansão automática de novas séries
- temporada
- fechamento e abertura de ciclo

## Banco
Entidades candidatas:
- Country
- LeagueSystem
- Division
- Season
- Standings
- MatchCalendar
- PromotionRule
- RelegationRule

## Critérios de aceite
- o país comporta múltiplas divisões
- as tabelas funcionam
- promoção e rebaixamento funcionam
- nova série é criada quando a inferior lotar

---

## 9. Fase 7 - Seleções e competições internacionais

## Objetivo
Expandir o universo além dos clubes.

## Escopo
- seleções nacionais
- convocação por técnico da seleção
- competições de seleção
- histórico internacional
- recordes internacionais

## Banco
Entidades candidatas:
- NationalTeam
- NationalCoach
- CallUp
- InternationalCompetition

---

## 10. Fase 8 - Expansão internacional de países

## Objetivo
Levar o sistema para fora do Brasil.

## Ordem aprovada
1. Brasil
2. Argentina
3. Espanha
4. demais países europeus

## Escopo
- múltiplos países
- divisões por país
- copas por país
- expansão mundial gradual

---

## 11. Fase 9 - Qualidade, balanceamento e retenção

## Objetivo
Refinar o jogo.

## Escopo
- balanceamento de atributos
- balanceamento de economia
- tuning de peneiras
- tuning de lesões
- tuning de progressão
- melhorias de UX do bot
- observabilidade
- logs
- auditoria de decisões críticas

---

## 12. Regra de execução do roadmap

Nunca pular diretamente para fases altas sem base estável.

A ordem ideal é:
1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5
6. Fase 6
7. Fase 7
8. Fase 8
9. Fase 9

Se houver dúvida, escolher sempre a fase mais baixa ainda não estabilizada.