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

## 2. Diretriz estrutural do produto

O produto agora assume explicitamente:
- jogo online centrado em humanos
- bots apenas como fallback controlado
- necessidade de distinguir humano e bot no domínio e na persistência

## 3. Camadas atuais

### `src/domain/`
Contém regras de negócio, tipos e serviços de:
- carreira do jogador
- partida por turnos
- multiplayer MVP
- política humano-primeiro e fallback com bot

### `src/infra/prisma/`
Contém a persistência principal em Prisma/PostgreSQL para:
- jogador
- clube
- partida
- lobby multiplayer
- tipos de participante e política de preenchimento

### `src/bot/`
Contém:
- dispatcher do Telegram
- fluxo conversacional de criação
- facade fina do bot
- renderers de cards textuais

### `src/infra/telegram/`
Contém a infraestrutura HTTP/Telegram para entregar as mensagens.

## 4. Multiplayer MVP na arquitetura

A capacidade multiplayer respeita a mesma arquitetura:
- domínio controla criação, entrada e leitura de estado do lobby
- domínio define se participante é humano ou bot
- domínio define política de fallback
- Prisma persiste sessão e participantes
- facade do bot expõe casos de uso
- dispatcher apenas roteia comandos e payloads

## 5. Relação entre partida solo e evolução multiplayer

A partida da Fase 2 continua separada e operacional.

Porém, a base estrutural deixa de assumir que tudo fora do usuário local é CPU inevitável.
A estrutura de partida e lobby passa a suportar explicitamente origem do participante, permitindo evolução futura para:
- humano vs humano
- humano + bot
- composição híbrida

## 6. Base visual MVP

A apresentação usa renderers dedicados que recebem dados já resolvidos por serviços.
Isso evita espalhar regra de negócio nas mensagens do Telegram e mantém coerência com a diretriz humano-first.

## 7. Persistência principal

Railway continua sendo o ambiente principal.
PostgreSQL continua sendo o banco principal.
Prisma continua sendo a camada de modelagem e acesso a dados.
