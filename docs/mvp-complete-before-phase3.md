# TeleSoccer - MVP completo pré-Fase 3

## 1. Definição oficial

O projeto entrou no estado de **MVP completo pré-Fase 3**.

Isso significa que o TeleSoccer deixa de ser somente uma fundação de carreira com partida solo e passa a ter uma primeira forma real de jogo online persistido com preparação multiplayer.

## 2. Os quatro pilares oficiais

### Pilar 1 - Carreira base
Inclui:
- criação de jogador
- atributos iniciais
- treino semanal
- peneira
- entrada no profissional
- histórico e carteira

### Pilar 2 - Partida jogável
Inclui:
- partida por turnos
- contextos de lance
- ações por botão
- timeout de 30 segundos
- persistência de eventos
- energia, lesões e disciplina

### Pilar 3 - Multiplayer MVP
Inclui agora:
- sala multiplayer persistida
- anfitrião e segundo participante humano
- estado da sessão consultável
- preparação da futura partida multiplayer
- integração mínima no bot

### Pilar 4 - Visual MVP
Inclui agora:
- cards textuais consistentes de partida
- cards textuais consistentes de lobby
- base de view model/renderização para evolução futura

## 3. O que entra nesta entrega

- documentação consolidada do MVP completo
- base de domínio e persistência para lobby multiplayer
- comandos mínimos de Telegram para fluxo multiplayer
- testes cobrindo criação, entrada, consulta e invalidação de entrada

## 4. O que continua fora de escopo

- ecossistema competitivo completo
- liga, calendário e temporada completos
- contratos completos
- mercado completo
- gestão completa de técnico
- visual rico fora do Telegram
- multiplayer compartilhado de ponta a ponta durante toda a partida

## 5. Princípio de evolução

A evolução aprovada é incremental:

1. lobby persistido
2. preparação da partida multiplayer
3. abertura de partida compartilhada por turnos
4. sincronização mais rica de estados e notificações

Nenhuma dessas etapas deve exigir reescrever carreira ou partida solo.
