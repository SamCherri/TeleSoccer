# TeleSoccer - Arquitetura

## 1. Princípios

Ordem de prioridade mantida no projeto:

1. regra de negócio
2. modelagem de dados
3. serviços de domínio
4. persistência
5. integração com bot Telegram
6. apresentação

## 2. Camadas atuais

### `src/domain/`
Regras de negócio puras.

- `player/`: carreira, treino, peneira e ficha
- `match/`: motor da partida solo por turnos
- `multiplayer/`: sessão pré-jogo com dois elencos, múltiplos humanos, slots persistidos, reservas e fallback

### `src/infra/`
Adaptadores de persistência e integrações.

- `prisma/`: repositórios reais sobre PostgreSQL
- `telegram/`: runtime e envio de mensagens
- `http/`: webhook para Railway

### `src/bot/`
Dispatcher e facade do bot Telegram.

- interpreta comandos
- chama serviços de domínio
- usa renderers para transformar dados resolvidos em cards textuais

### `src/view-models/`
Normalização de dados para apresentação.

### `src/presentation/`
Renderização visual textual reutilizável.

## 3. Arquitetura multiplayer corrigida

O projeto saiu de uma estrutura implícita de “host + segundo participante” e passou para uma base de sessão com elencos.

### Entidades centrais
- `MultiplayerSession`
- `MultiplayerSessionSlot`
- `MultiplayerSessionParticipant`

### Eixos de composição
- lado: `HOME` ou `AWAY`
- papel no elenco: `STARTER` ou `SUBSTITUTE`
- origem do participante: `HUMAN` ou `BOT`

### Configurações persistidas
- `fillPolicy`
- `maxStartersPerSide`
- `maxSubstitutesPerSide`
- `botFallbackEligibleSlots`
- `minimumHumansToStart`
- `linkedMatchId`
- `status`

## 4. Partida e futura convergência

A Fase 2 permanece focada em partida solo por turnos, mas a modelagem de sessão agora deixa explícita a direção futura para:

- lineups híbridos humano + bot
- múltiplos humanos por lado
- reaproveitamento de participantes persistidos em `Match`
- expansão gradual até 11x11 + banco de reservas

## 5. Camada visual integrada à lógica

A regra não renderiza texto final diretamente.

Fluxo atual:

1. domínio resolve estado
2. view model organiza os dados
3. renderer monta o card textual
4. facade do bot devolve a resposta para o Telegram
