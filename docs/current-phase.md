# TeleSoccer - Fase Atual

## Fase atual
**Fase 2 - Núcleo da partida por turnos**

---

## 1. Objetivo

Implementar a base funcional das partidas jogáveis no Telegram.

Esta fase deve permitir que um usuário profissional:

- entre em uma partida
- receba o contexto do lance
- escolha ações válidas por botões simples
- perca o turno se não responder em 30 segundos
- acompanhe placar, tempo e eventos recentes
- registre faltas, pênaltis, escanteios, cartões, suspensão, energia e lesões
- conclua a partida de ponta a ponta com persistência

---

## 2. Escopo fechado da fase

### 2.1 Estrutura da partida
Implementar:

- criação da partida
- clube mandante e adversário
- placar persistido
- tempo da partida
- 2 tempos de jogo
- acréscimos simples por evento
- encerramento da partida

### 2.2 Turnos de 30 segundos
Implementar:

- um turno ativo por vez
- deadline persistido por lance
- resolução por ação do usuário
- resolução por timeout quando o prazo expira

### 2.3 Contexto de lance
Implementar contextos curtos e coerentes, incluindo:

- recebeu livre
- recebeu pressionado
- recebeu de costas para o gol
- recebeu na área
- duelo defensivo
- contexto de goleiro
- bola parada simples

### 2.4 Ações simples por botão
Implementar ações contextuais, incluindo exemplos como:

- passar
- driblar
- finalizar
- dominar
- proteger bola
- dar bote
- afastar
- defender
- espalmar
- segurar
- sair do gol
- cobranças simples por lado e altura

### 2.5 Eventos obrigatórios
Implementar persistência e exibição de:

- gols
- faltas
- pênaltis
- escanteios
- tiros de meta
- cartões amarelos
- cartões vermelhos
- suspensões automáticas
- lesões
- energia física

---

## 3. Fora de escopo nesta fase

Não implementar agora:

- contrato completo
- mercado de transferências
- técnico usuário
- escalação completa manual
- temporada completa
- tabela de liga
- promoção e rebaixamento
- seleções
- prorrogação completa e disputa por pênaltis de mata-mata

---

## 4. Entidades mínimas esperadas

- Match
- MatchLineup
- MatchTurn
- MatchEvent
- MatchDisciplinaryEvent
- InjuryRecord
- SuspensionRecord

---

## 5. Regras de negócio obrigatórias

### Partida
- só jogador profissional entra em partida
- a partida precisa ser persistida até o encerramento
- o jogador controla apenas o próprio personagem

### Turno
- cada lance tem 30 segundos
- sem resposta no prazo, o lance é perdido
- o sistema só oferece ações válidas para o contexto atual

### Disciplina
- cartão vermelho gera suspensão automática da próxima partida
- eventos disciplinares devem ficar persistidos

### Lesão e energia
- a energia cai ao longo da partida
- lesão pode ser registrada durante a partida
- a lesão deve guardar gravidade e partidas restantes

---

## 6. Fluxos do usuário que precisam existir

### Fluxo 1 - Entrar em partida
Usuário profissional inicia uma nova partida pelo bot.

### Fluxo 2 - Ver lance atual
Usuário vê placar, minuto, contexto e ações disponíveis.

### Fluxo 3 - Resolver lance
Usuário escolhe uma ação e recebe o resultado imediato.

### Fluxo 4 - Perder lance por tempo
Se o usuário não responder em 30 segundos, o lance é perdido e isso fica registrado.

### Fluxo 5 - Acompanhar partida
Usuário consulta a partida atual e acompanha eventos recentes, energia, cartões e possível lesão.

### Fluxo 6 - Encerrar partida
Usuário vê o placar final e o fim da partida registrado.

---

## 7. Impacto esperado no banco

Esta fase deve deixar o banco pronto para:

- partidas persistidas por jogador
- histórico de turnos e eventos
- expansão futura para lineups mais completas
- disciplina e suspensão por partida
- lesões vinculadas à partida

---

## 8. Impacto esperado no bot Telegram

O bot deve conseguir, no mínimo:

- iniciar partida
- mostrar o lance atual
- receber a ação do usuário
- processar timeout
- exibir placar, tempo e eventos recentes
- encerrar a partida com feedback final

---

## 9. Critérios de aceite

A fase só deve ser considerada pronta quando:

1. o jogador profissional conseguir iniciar partida sem inconsistência
2. o bot mostrar contexto do lance com ações válidas
3. o turno de 30 segundos for respeitado
4. timeout produzir perda de posse e registro do evento
5. faltas, pênaltis, cartões, suspensão, energia e lesão forem persistidos
6. a partida chegar ao fim com placar final coerente
7. os fluxos do bot estiverem funcionais
8. a implementação respeitar a arquitetura existente

---

## 10. Diretriz de implementação

Ao implementar esta fase:

- manter a lógica da partida no domínio
- manter a camada Telegram como interface fina
- preservar a Fase 1 sem regressões
- preparar o terreno para contrato, técnico e temporada em fases futuras
