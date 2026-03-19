# TeleSoccer - Fase Atual

## Fase atual
**Fase 2 consolidada + MVP estrutural pré-Fase 3**

---

## 1. Objetivo

Consolidar a Fase 2 e corrigir a direção do multiplayer antes da Fase 3, deixando o TeleSoccer com:

- partida solo por turnos preservada
- base multiplayer humano-first com múltiplos jogadores por sessão
- dois lados persistidos (`HOME` e `AWAY`)
- titulares e reservas por lado
- bots apenas como fallback controlado
- camada visual MVP entregue junto com a lógica

---

## 2. Escopo fechado atual

### 2.1 Base já estabilizada
- criação e progressão inicial do jogador
- treino semanal e peneira
- partida solo por turnos no Telegram
- persistência de energia, cartões, lesões e suspensões

### 2.2 Correção estrutural do multiplayer
- `MultiplayerSession` com dois lados
- muitos participantes por sessão
- `MultiplayerSessionParticipant` por lado e por vaga
- `STARTER` e `SUBSTITUTE`
- `HUMAN` e `BOT`
- política `HUMAN_ONLY` ou `HUMAN_PRIORITY_WITH_BOT_FALLBACK`
- slots persistidos por lado/papel, com marcação explícita de fallback
- leitura de prontidão e permissão de preparação da sessão

### 2.3 Camada visual MVP oficial
- card forte de sessão multiplayer
- card de elenco por lado
- card de preparação do confronto
- card de partida com identidade visual mais forte
- separação entre domínio, view models e renderers

---

## 3. Fora de escopo nesta fase

Ainda não entra como entrega fechada:

- tática completa
- 11x11 jogável ponta a ponta
- sincronização total da partida compartilhada
- substituições dinâmicas em partida multiplayer viva
- formação detalhada por posição em campo

---

## 4. Direção arquitetural obrigatória

A arquitetura **não** pode mais assumir “sala = 2 pessoas”.

A base correta agora é:

- sessão com dois elencos
- múltiplos humanos por lado
- mistura híbrida com bots só como fallback
- ligação futura entre sessão e `Match`
- camada visual evoluindo junto do backend

---

## 5. Critérios de aceite deste estado

O estado atual só é válido porque:

1. Fase 1 continua funcional
2. Fase 2 continua funcional
3. a modelagem multiplayer suporta mais de 2 participantes
4. a sessão diferencia lados, papéis de elenco e tipo do participante
5. a apresentação visual acompanha a regra implementada
6. a documentação oficial já reflete a direção humano-first
