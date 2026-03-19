# TeleSoccer - Game Design

## 1. Proposta

TeleSoccer é um jogo de futebol online via bot do Telegram com foco em jogadores humanos reais.

A progressão começa pela carreira de um jogador, mas o produto já precisa comunicar que existe um universo de jogo online, e não apenas uma automação textual administrativa.

## 2. Princípio humano-first

O multiplayer segue estas regras:

- humanos são o padrão
- bots não são o padrão
- bots entram apenas como fallback controlado
- cada sessão possui dois lados
- cada lado pode ter titulares e reservas
- a estrutura deve crescer até 11x11 + reservas

## 3. Experiência visual MVP

Mesmo dentro do Telegram, a apresentação precisa reforçar fantasia de jogo.

### Cards oficiais do MVP
- sessão multiplayer
- elenco por lado
- preparação do confronto
- partida em andamento

### Objetivo desses cards
- comunicar estado rapidamente
- reforçar HOME vs AWAY
- diferenciar humano e bot
- diferenciar titular e reserva
- mostrar prontidão do confronto
- tornar o jogo visualmente mais legível

## 4. Limites atuais do design

Nesta etapa, o produto ainda não entrega:

- mapa tático completo
- formação visual 11x11
- interação simultânea ao vivo entre todos os humanos

Mas a base de dados, a regra e a apresentação já foram alinhadas para chegar lá sem retrabalho estrutural grande.


## 5. Regras operacionais do MVP multiplayer

- só jogador profissional entra no multiplayer
- o host prepara a sala
- bots só podem preencher slots marcados para fallback
- fallback não deve antecipar a entrada humana mínima
