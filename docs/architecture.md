# TeleSoccer - Arquitetura

## 1. Princípio geral

A arquitetura do TeleSoccer continua modular e centrada em domínio.

Ordem de prioridade:
1. regra de negócio
2. modelagem de dados
3. serviços de domínio
4. persistência
5. integração Telegram
6. apresentação

## 2. Camadas atuais

### `src/domain/`
Contém regras de negócio, tipos e serviços de:
- carreira do jogador
- partida por turnos
- multiplayer MVP

### `src/infra/prisma/`
Contém a persistência principal em Prisma/PostgreSQL para:
- jogador
- clube
- partida
- lobby multiplayer

### `src/bot/`
Contém:
- dispatcher do Telegram
- fluxo conversacional de criação
- facade fina do bot
- renderers de cards textuais

### `src/infra/telegram/`
Contém a infraestrutura HTTP/Telegram para entregar as mensagens.

## 3. Entrada do multiplayer MVP

A nova capacidade multiplayer respeita a mesma arquitetura:

- domínio controla criação, entrada e leitura de estado do lobby
- Prisma persiste sessão e participantes
- facade do bot expõe casos de uso
- dispatcher apenas roteia comandos e payloads

## 4. Relação entre partida solo e multiplayer MVP

A partida da Fase 2 continua separada e operacional.

O multiplayer MVP não substitui a partida solo nesta entrega.
Ele adiciona a preparação persistida para a futura partida compartilhada, com vínculo pronto para expansão por `Match`.

## 5. Base visual MVP

A apresentação usa renderers dedicados que recebem dados já resolvidos por serviços.
Isso evita espalhar regra de negócio nas mensagens do Telegram.

## 6. Persistência principal

Railway continua sendo o ambiente principal.
PostgreSQL continua sendo o banco principal.
Prisma continua sendo a camada de modelagem e acesso a dados.
