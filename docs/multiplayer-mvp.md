# TeleSoccer - Multiplayer MVP

## 1. Objetivo

Introduzir o primeiro fluxo multiplayer real do TeleSoccer sem quebrar a base existente.

## 2. Decisão arquitetural

A entrada oficial do multiplayer ocorre por **lobby persistido**.

Estrutura mínima aprovada:
- `MultiplayerLobby`
- `MultiplayerLobbyParticipant`
- `CreateLobbyService`
- `JoinLobbyService`
- `GetLobbyStatusService`

Essa estrutura prepara a futura partida compartilhada sem exigir matchmaking complexo agora.

## 3. Regra de negócio

- apenas jogadores profissionais podem abrir ou entrar em sala
- a sala nasce com 1 participante humano: o anfitrião
- a sala aceita até 2 participantes nesta fase
- quando o segundo usuário entra, a sala muda para `READY`
- o estado `READY` representa preparação oficial da futura partida multiplayer
- a sessão permanece persistida para consulta posterior

## 4. Estados

### OPEN
- sala criada
- aguardando segundo usuário

### READY
- dois usuários humanos vinculados
- preparação multiplayer liberada

### CLOSED
- reservado para encerramento explícito em evolução futura

## 5. Fluxo do usuário

### Fluxo A - Criar sala
1. usuário profissional abre o menu multiplayer
2. cria uma sala
3. recebe código persistido
4. pode consultar a sala depois

### Fluxo B - Entrar na sala
1. segundo usuário profissional recebe o código
2. envia `/entrar-sala CODIGO`
3. entra na mesma sessão persistida
4. a sala passa para `READY`

### Fluxo C - Consultar estado
1. qualquer participante usa `/sala`
2. o bot devolve participantes, estado e prontidão da sessão

## 6. Banco

Persistência principal no Prisma/PostgreSQL com:
- tabela de lobby
- tabela de participantes
- relação com `User`
- relação com `Player`
- ponte opcional com `Match` para evolução futura

## 7. Fora de escopo do multiplayer MVP

- matchmaking por fila pública
- salas com mais de 2 humanos
- ranking
- modo competitivo formal
- reconciliação avançada de conexão
- toda a resolução da partida compartilhada nesta mesma entrega
