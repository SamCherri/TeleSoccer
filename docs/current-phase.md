# TeleSoccer - Fase Atual

## Fase atual
**MVP completo pré-Fase 3 - carreira base + partida jogável + multiplayer MVP + visual MVP, com humanos primeiro e bots como fallback**

---

## 1. Objetivo

Transformar o TeleSoccer no começo real de um jogo online via Telegram centrado em jogadores humanos reais.

A base já estabilizada de Fase 1 e Fase 2 continua válida, mas agora o projeto opera com quatro pilares oficiais do MVP completo pré-Fase 3:

1. carreira base persistida
2. partida jogável por turnos
3. multiplayer MVP simples, online e persistido
4. visual MVP mínimo para apresentar o jogo com clareza

Diretriz obrigatória desta etapa:
- humanos são o padrão
- bots são contingência
- a arquitetura deve saber distinguir humano e bot
- a evolução futura da partida multiplayer depende dessa base

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
- base estrutural para origem do participante

### 2.3 Multiplayer MVP obrigatório
- criação de sala online persistida por humano profissional
- entrada do segundo humano na mesma sessão
- consulta do estado da sala
- política explícita de preenchimento com humanos primeiro
- marcação estrutural de vagas elegíveis para bot fallback
- preparação da sessão para futura partida multiplayer compartilhada

### 2.4 Visual MVP mínimo
- renderização textual consistente para cards de partida
- renderização textual consistente para cards de lobby multiplayer
- linguagem de produto alinhada a jogo online entre humanos

---

## 3. Regra de negócio oficial

### Humanos primeiro
- todo jogador controlável deve ser humano por padrão
- o sistema tenta formar experiências com pessoas reais primeiro
- salas e partidas futuras devem considerar humanos como prioridade principal

### Bots como fallback
- bot não é padrão de design do produto
- bot só entra por contingência quando faltarem humanos
- a base precisa permitir vaga elegível para bot sem obrigar bot imediato
- quando houver humano disponível, a prioridade é do humano

### Arquitetura
- regra de negócio no domínio
- Prisma + PostgreSQL como persistência principal
- Telegram como interface fina
- Fase 1 e Fase 2 preservadas sem regressão

---

## 4. Fluxos do usuário que precisam existir agora

1. usuário cria jogador e evolui normalmente
2. jogador profissional entra em partida solo normalmente
3. usuário profissional abre uma sala online para humanos
4. segundo humano entra com código persistido
5. ambos consultam o estado da sessão
6. a sessão pronta representa preparação da futura partida compartilhada
7. a sessão pode registrar vaga elegível para bot fallback sem substituir a prioridade humana

---

## 5. Impacto esperado no banco

Esta etapa deve deixar o banco pronto para:

- sessões multiplayer persistidas
- distinção persistida entre participante humano e participante bot
- política de preenchimento humano-primeiro com fallback
- vagas elegíveis para bot quando faltarem humanos
- futura ligação da sessão a uma partida multiplayer compartilhada
- evolução da estrutura de partida para composição humano vs humano, humano + bot ou híbrida

---

## 6. Impacto esperado no bot Telegram

O bot deve conseguir, no mínimo:

- continuar operando carreira e partida solo
- abrir o menu do multiplayer MVP com linguagem de humanos primeiro
- criar sala multiplayer
- entrar em sala por código
- consultar estado da sala
- comunicar claramente que bot é fallback e não padrão

---

## 7. Impacto visual

O visual MVP deve:
- deixar a experiência mais legível no Telegram
- mostrar participantes humanos reais da sala
- exibir vagas humanas abertas e elegibilidade de fallback com bot
- preparar a futura evolução visual sem mover regra para o bot

---

## 8. Fora de escopo nesta etapa

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

## 9. Critérios de aceite

A etapa só deve ser considerada pronta quando:

1. o projeto estiver documentado como jogo online centrado em humanos
2. bots estiverem documentados como fallback apenas
3. a sala multiplayer puder ser criada com persistência
4. um segundo humano puder entrar na mesma sala persistida
5. humano e bot estiverem distinguidos claramente no domínio
6. a sessão suportar estruturalmente fallback sem quebrar a prioridade humana
7. o bot comunicar a nova direção corretamente
8. Fase 1 e Fase 2 continuarem funcionais
