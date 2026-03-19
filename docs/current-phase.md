# TeleSoccer - Fase Atual

## Fase atual
**Fase 2.5 - MVP completo pré-Fase 3**

---

## 1. Objetivo

Concluir um MVP jogável, online e coerente do TeleSoccer no Telegram antes da Fase 3.

Este MVP deve permitir que o usuário:

- crie e evolua seu jogador
- entre em partidas jogáveis por turnos
- jogue online pelo bot com persistência em nuvem
- participe de partidas multiplayer simples
- veja feedback visual mínimo do jogo
- acompanhe placar, contexto, eventos e status da partida
- conclua a experiência principal do produto sem depender ainda de ligas completas e temporadas completas

---

## 2. Escopo fechado da fase

### 2.1 Base online jogável
Implementar e consolidar:

- bot Telegram como interface principal
- persistência em banco na nuvem
- partidas persistidas
- leitura e atualização de estado online
- tolerância a retomada de partida

### 2.2 Carreira base do jogador
Garantir e consolidar:

- criação do jogador
- atributos iniciais
- treino semanal
- peneira
- entrada no profissional
- histórico básico

### 2.3 Partida por turnos
Garantir e consolidar:

- início de partida
- placar persistido
- dois tempos
- contexto do lance
- ações válidas por botão
- timeout de 30 segundos com resolução funcional
- energia
- faltas
- pênaltis
- escanteios
- tiros de meta
- cartões
- suspensões
- lesões
- encerramento da partida

### 2.4 Multiplayer MVP
Implementar de forma simples:

- criação de sala ou convite de partida
- entrada de dois usuários humanos na mesma sessão
- partida amistosa simples
- estado compartilhado da partida
- turnos sincronizados entre os participantes
- abandono ou ausência com regra mínima de continuidade ou derrota técnica

### 2.5 Visual MVP
Implementar uma camada visual mínima funcional no Telegram, incluindo:

- cards visuais da partida
- feedback visual de contexto de lance
- feedback visual de gol, cartão, lesão e placar
- identidade visual mínima compatível com o jogo
- base de assets simples e expansível

---

## 3. Fora de escopo nesta fase

Não implementar agora:

- temporada completa
- tabela de liga
- promoção e rebaixamento
- mercado de transferências completo
- técnico usuário completo
- dono de clube
- criação livre de clube por usuário
- contratos completos detalhados
- escalação manual completa de 11 jogadores
- partidas em tempo real estilo action game
- renderização gráfica avançada
- animações complexas
- economia completa de clubes

---

## 4. Entidades mínimas esperadas

A estrutura exata deve respeitar a arquitetura atual do repositório, mas o MVP deve suportar no mínimo:

- User
- Player
- PlayerGeneration
- PlayerAttribute
- Wallet
- TrainingSession
- TryoutAttempt
- Club
- ClubMembership
- Match
- MatchLineup
- MatchTurn
- MatchEvent
- MatchDisciplinaryEvent
- InjuryRecord
- SuspensionRecord
- MatchLobby ou equivalente
- MatchParticipant ou equivalente
- estrutura mínima para suporte visual, se necessária

---

## 5. Regras de negócio obrigatórias

### Jogador
- começa com base jogável coerente
- evolui por treino
- pode entrar no profissional
- mantém histórico persistido

### Partida
- só jogador profissional entra em partida oficial do fluxo atual
- a partida precisa ser persistida até o encerramento
- o jogador controla apenas o próprio personagem
- a partida deve poder ser retomada por leitura de estado

### Timeout
- cada lance tem 30 segundos
- sem resposta no prazo, o lance é perdido
- a partida não pode ficar travada indefinidamente por turno expirado

### Multiplayer MVP
- dois usuários humanos podem entrar na mesma experiência de partida simples
- a sessão compartilhada precisa ser persistida
- o estado visto pelos dois usuários precisa ser coerente
- a solução pode ser simples, desde que funcional e online

### Visual MVP
- o jogo precisa apresentar feedback visual mínimo
- a camada visual deve ajudar o usuário a perceber que está em um jogo, e não apenas em um menu textual
- os elementos visuais devem ser simples, mas consistentes

---

## 6. Fluxos do usuário que precisam existir

### Fluxo 1 - Criar jogador
Usuário cria seu atleta.

### Fluxo 2 - Evoluir jogador
Usuário treina, consulta ficha e tenta peneira.

### Fluxo 3 - Entrar em partida
Usuário profissional inicia partida.

### Fluxo 4 - Resolver lance
Usuário vê contexto, escolhe ação e recebe resultado.

### Fluxo 5 - Acompanhar partida
Usuário consulta a partida atual, vê eventos, energia, cartões, lesão e placar.

### Fluxo 6 - Entrar em partida multiplayer simples
Usuário cria ou entra em uma sessão compartilhada com outro usuário.

### Fluxo 7 - Receber feedback visual
Usuário recebe feedback visual mínimo do estado do jogo e dos principais eventos.

### Fluxo 8 - Encerrar partida
Usuário vê o placar final e o fechamento persistido da partida.

---

## 7. Impacto esperado no banco

Esta fase deve deixar o banco pronto para:

- partidas persistidas por jogador
- histórico de turnos e eventos
- disciplina e suspensão por partida
- lesões vinculadas à partida
- sessões multiplayer simples
- participação de múltiplos usuários humanos em partidas futuras
- expansão posterior para temporadas e ligas

---

## 8. Impacto esperado no bot Telegram

O bot deve conseguir, no mínimo:

- iniciar criação do jogador
- salvar criação
- mostrar ficha
- oferecer treino
- oferecer peneira
- iniciar partida
- mostrar o lance atual
- receber a ação do usuário
- processar timeout
- exibir placar, tempo e eventos
- exibir feedback visual mínimo
- suportar fluxo multiplayer simples
- encerrar a partida com feedback final

---

## 9. Critérios de aceite

A fase só deve ser considerada pronta quando:

1. o usuário conseguir completar a base da carreira sem inconsistência
2. o jogador profissional conseguir iniciar partida sem inconsistência
3. o bot mostrar contexto do lance com ações válidas
4. o turno de 30 segundos for respeitado funcionalmente
5. timeout produzir perda de posse e registro do evento
6. faltas, pênaltis, cartões, suspensão, energia e lesão forem persistidos
7. a partida chegar ao fim com placar final coerente
8. dois usuários conseguirem participar do multiplayer MVP definido para esta fase
9. o jogo exibir camada visual mínima funcional no Telegram
10. os fluxos do bot estiverem funcionais
11. a implementação respeitar a arquitetura existente

---

## 10. Diretriz de implementação

Ao implementar esta fase:

- manter a lógica do jogo no domínio
- manter a camada Telegram como interface fina
- preservar a Fase 1 sem regressões
- não inventar sistemas completos de fases futuras
- manter a solução simples, robusta e expansível
- priorizar um MVP coerente sobre complexidade desnecessária