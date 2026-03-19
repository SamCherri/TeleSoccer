# TeleSoccer - Multiplayer MVP

## 1. Objetivo

Estabelecer o multiplayer correto como sessão com dois elencos, sem prender o produto a um lobby de apenas 2 participantes.

## 2. Estrutura mínima entregue

### Sessão
- código único
- host humano
- dois lados: `HOME` e `AWAY`
- política de preenchimento
- limite de titulares por lado
- limite de reservas por lado
- slots persistidos com elegibilidade de fallback
- status da sessão
- ligação futura com `Match`

### Participante
Cada participante registra:
- lado
- slot por lado e por papel de elenco
- `STARTER` ou `SUBSTITUTE`
- `HUMAN` ou `BOT`
- vínculos opcionais com `userId` e `playerId`
- marcação de host/capitão

## 3. Fluxos do bot

- `/multiplayer`: hub do modo online
- `/criar-sala`: cria uma sessão humano-first
- `/sala`: lê a sessão atual do participante
- `/sala CODIGO`: lê uma sessão pelo código para qualquer jogador profissional que tenha o código
- `/entrar-sala CODIGO HOME TITULAR`: entra explicitando lado e papel
- `/preparar-sala`: aplica fallback elegível e recalcula prontidão

## 4. Regras de negócio

- criar, entrar, consultar e preparar sala exige jogador profissional
- humano entra primeiro
- slot é ocupado por lado + papel de elenco + número da vaga
- bots só entram quando a política permitir, o mínimo humano tiver sido atingido e houver slot elegível
- apenas o host prepara a sala nesta etapa, levando a sessão ao estado `PREPARING_MATCH` quando a preparação fecha corretamente
- a sessão não possui limite estrutural total de 2 participantes
- a prontidão considera mínimo de humanos, titulares humanos em ambos os lados e ausência de fallback pendente

## 5. Direção futura

Esta modelagem foi escolhida para suportar:

- 11x11 + reservas
- partida compartilhada multiplayer
- composição híbrida por lineup
- preparação pré-jogo reutilizável pela camada de `Match`
