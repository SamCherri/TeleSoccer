# TeleSoccer - MVP completo pré-Fase 3

## 1. Definição oficial

O TeleSoccer entrou no estado de **MVP completo pré-Fase 3** como jogo online via Telegram centrado em humanos.

Isso significa que o projeto deixa de tratar multiplayer como detalhe periférico e passa a tratá-lo como base oficial da evolução do produto.

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
- base estrutural para origem dos participantes

### Pilar 3 - Multiplayer MVP
Inclui agora:
- sessão online persistida
- anfitrião humano e segundo participante humano
- estado da sessão consultável
- política humano-primeiro com fallback controlado
- preparação da futura partida multiplayer

### Pilar 4 - Visual MVP
Inclui agora:
- cards textuais consistentes de partida
- cards textuais consistentes de lobby
- linguagem visual e textual coerente com jogo humano-first

## 3. Regra oficial de produto

- personagens controláveis devem ser humanos por padrão
- o sistema tenta formar experiências com humanos primeiro
- bots só entram quando faltarem pessoas suficientes
- a distinção entre humano e bot deve existir no domínio e na persistência

## 4. O que entra nesta entrega

- documentação consolidada da nova direção do produto
- modelagem explícita para participante humano vs bot
- política persistida de preenchimento com fallback
- lobby multiplayer online com humanos primeiro
- testes cobrindo a nova direção arquitetural

## 5. O que continua fora de escopo

- ecossistema competitivo completo
- liga, calendário e temporada completos
- contratos completos
- mercado completo
- gestão completa de técnico
- visual rico fora do Telegram
- partida multiplayer compartilhada completa durante toda a resolução

## 6. Princípio de evolução

A evolução aprovada é incremental:

1. lobby persistido humano-first
2. fallback controlado e elegibilidade de vagas
3. preparação da partida multiplayer
4. partida compartilhada com humanos e fallback onde necessário
5. sincronização mais rica de estados e notificações

Nenhuma dessas etapas deve exigir reescrever carreira ou partida solo.
