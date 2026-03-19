# TeleSoccer - Fase Atual

## Fase atual
**MVP completo pré-Fase 3 - carreira base + partida jogável + multiplayer MVP + visual MVP**

---

## 1. Objetivo

Transformar o TeleSoccer no começo real do produto online via Telegram.

A base já estabilizada de Fase 1 e Fase 2 continua válida, mas agora o projeto passa a operar com quatro pilares oficiais do MVP completo pré-Fase 3:

1. carreira base persistida
2. partida jogável por turnos
3. multiplayer MVP simples e persistido
4. visual MVP mínimo para apresentar o jogo com mais clareza

---

## 2. Escopo fechado desta etapa

### 2.1 Carreira base preservada
- criação de jogador
- atributos iniciais
- treino semanal
- peneira
- entrada no profissional
- histórico e carteira

### 2.2 Partida jogável preservada
- partida persistida por turnos
- contexto de lance
- ações válidas por botão
- timeout de 30 segundos
- eventos, disciplina, energia e lesão

### 2.3 Multiplayer MVP obrigatório
- criação de sala multiplayer persistida
- entrada do segundo usuário humano na mesma sessão
- consulta do estado da sala
- preparação da sessão para futura partida multiplayer compartilhada
- integração mínima no bot com comandos e ações coerentes

### 2.4 Visual MVP mínimo
- renderização textual consistente para cards de partida
- renderização textual consistente para cards de lobby multiplayer
- base de apresentação pronta para próxima camada visual sem mover regra de negócio para o bot

---

## 3. Fora de escopo nesta etapa

Não entram agora:

- matchmaking público complexo
- ranking competitivo
- liga completa
- temporada completa
- torneios
- técnico usuário completo
- mercado completo
- contratos completos
- partida multiplayer completa até o apito final com todos os turnos compartilhados
- interface web pesada

---

## 4. Regras de negócio obrigatórias

### Carreira e partida
- preservar os fluxos da Fase 1 e da Fase 2 sem regressão
- manter a lógica principal no domínio
- manter Telegram como interface fina

### Multiplayer MVP
- apenas jogadores profissionais participam das salas multiplayer
- a sessão deve ser persistida no PostgreSQL via Prisma
- dois usuários humanos devem poder ficar vinculados à mesma sessão persistida
- a sala deve ter estado legível: aberta, pronta ou encerrada
- a sala pronta representa preparação oficial para a futura partida multiplayer

### Visual MVP
- apresentação deve ser compatível com Telegram
- o formato visual não pode acoplar a lógica de jogo ao dispatcher
- o formato deve ser reaproveitável para próximos cards do jogo

---

## 5. Fluxos do usuário que precisam existir agora

1. usuário cria jogador e evolui normalmente
2. jogador profissional entra em partida solo normalmente
3. usuário profissional abre uma sala multiplayer
4. segundo usuário entra na sala com um código persistido
5. ambos consultam o estado da sessão
6. o lobby pronto indica preparação liberada para evolução da partida multiplayer

---

## 6. Impacto esperado no banco

Esta etapa deve deixar o banco pronto para:

- sessões multiplayer persistidas
- participantes humanos vinculados à mesma sessão
- futura ligação da sessão a uma partida multiplayer compartilhada
- manutenção da base já existente de carreira e partidas

---

## 7. Impacto esperado no bot Telegram

O bot deve conseguir, no mínimo:

- continuar operando carreira e partida solo
- abrir o menu do multiplayer MVP
- criar sala multiplayer
- entrar em sala por código
- consultar estado da sala
- exibir cards textuais mais consistentes para partida e lobby

---

## 8. Critérios de aceite

A etapa só deve ser considerada pronta quando:

1. a documentação refletir oficialmente o MVP completo pré-Fase 3
2. Fase 1 e Fase 2 continuarem funcionais
3. a sala multiplayer puder ser criada com persistência
4. um segundo usuário puder entrar na mesma sala persistida
5. o estado da sessão puder ser consultado de forma coerente
6. o bot tiver fluxo mínimo funcional para multiplayer MVP
7. a base visual mínima estiver aplicada sem exagero arquitetural
