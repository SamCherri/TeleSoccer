# TeleSoccer - Multiplayer MVP

## 1. Objetivo

Introduzir o primeiro fluxo multiplayer real do TeleSoccer com prioridade para jogadores humanos reais e fallback com bot apenas por contingência.

## 2. Regra de negócio central

- sala é uma sessão online persistida
- anfitrião e segundo participante são humanos por padrão
- a sessão distingue explicitamente humano e bot
- a política padrão é `humanos primeiro, bot como fallback`
- bot não é criado automaticamente nesta etapa
- a sessão pode marcar vaga elegível para bot para evolução futura

## 3. Estrutura aprovada

Base mínima do multiplayer MVP:
- `MultiplayerLobby`
- `MultiplayerLobbyParticipant`
- `MultiplayerLobbyFillPolicy`
- `MultiplayerParticipantKind`
- `CreateLobbyService`
- `JoinLobbyService`
- `GetLobbyStatusService`
- `MarkLobbyBotFallbackEligibleService`

## 4. Fluxo do usuário

### Fluxo A - Criar sala humana
1. jogador profissional humano abre o menu multiplayer
2. cria sala online persistida
3. recebe código de convite
4. a sessão fica aguardando segundo humano

### Fluxo B - Entrar na sala
1. segundo jogador humano recebe o código
2. envia `/entrar-sala CODIGO`
3. entra na mesma sessão persistida
4. a sala muda para `READY`

### Fluxo C - Consultar estado
1. qualquer participante usa `/sala`
2. o bot mostra participantes, política de preenchimento, vagas humanas e fallback elegível

### Fluxo D - Preparar fallback estrutural
1. a sessão continua priorizando humanos
2. se faltar humano no futuro fluxo operacional, a vaga pode ser marcada como elegível para bot
3. isso prepara o preenchimento contingencial futuro sem inverter a prioridade do produto

## 5. Impacto no banco

Persistência principal no Prisma/PostgreSQL com:
- status da sala
- política de preenchimento
- capacidade humana da sessão
- contagem de vagas elegíveis para fallback com bot
- tipo do participante (`HUMAN` ou `BOT`)
- ponte opcional com `Match` para evolução futura

## 6. Impacto no bot Telegram

O bot deve:
- falar em jogadores humanos reais
- mostrar claramente o código da sala
- indicar que bot é fallback e não padrão
- refletir participantes humanos e vagas abertas

## 7. Impacto visual

Os cards do lobby devem exibir:
- política humano-primeiro
- participantes por tipo
- vagas humanas abertas
- elegibilidade de fallback com bot

## 8. Fora de escopo do multiplayer MVP

- matchmaking público grande
- ranking
- fila global completa
- bot autônomo real entrando na sala
- partida multiplayer completa com todos os turnos sincronizados
