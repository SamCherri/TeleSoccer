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

Esses módulos continuam separados por responsabilidade de domínio, mas a experiência entregue no bot agora é unificada como um hub de mundo MMORPG.

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

## 4. Partida, sessão e convergência de experiência

A Fase 2 permanece focada em partida por turnos, mas a modelagem de sessão agora deixa explícita a direção futura para:

- lineups híbridos humano + bot
- múltiplos humanos por lado
- reaproveitamento de participantes persistidos em `Match`
- expansão gradual até 11x11 + banco de reservas

No bot, isso agora aparece como um único fluxo:

- o jogador entra primeiro no **mundo do jogador**
- os principais acessos são botões contextuais como agenda, centro de treinamento, vestiário e convites
- `/mmorpg` e `/multiplayer` existem apenas como atalhos de compatibilidade
- o hub agrega estado de carreira, rotina, partida ativa e sessão compartilhada

## 5. Camada visual integrada à lógica

A regra não renderiza texto final diretamente.

Fluxo atual:

1. domínio resolve estado
2. view model organiza os dados
3. renderer monta o card textual
4. facade do bot devolve a resposta para o Telegram


## 6. Política de consulta da sala

- `/sala` sem código consulta a sala atual do participante
- `/sala CODIGO` pode ser usada por qualquer jogador profissional que possua o código da sessão
- `/preparar-sala` continua restrito ao host
