# TeleSoccer - Fase Atual

## Fase atual
**Fase 2 consolidada + MVP estrutural pré-Fase 3 com fluxo MMORPG unificado**

---

## 1. Objetivo

Consolidar a Fase 2 e corrigir a direção do multiplayer antes da Fase 3, deixando o TeleSoccer com:

- carreira, partida e sessão compartilhada no mesmo fluxo MMORPG
- partida por turnos preservada como parte desse mesmo mundo
- base multiplayer humano-first com múltiplos jogadores por sessão
- dois lados persistidos (`HOME` e `AWAY`)
- titulares e reservas por lado
- bots apenas como fallback controlado
- camada visual MVP entregue junto com a lógica
- linguagem visual oficial da partida definida e respeitada

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
- leitura de prontidão, permissão de preparação e transição para estado real de preparação da sessão

### 2.3 Convergência de experiência no bot
- o usuário não navega mais como se existissem “modo solo” e “modo multiplayer” separados
- o ponto principal passa a ser um **hub de mundo**
- a navegação principal usa botões contextuais e ambientes diegéticos
- `/mmorpg` e `/multiplayer` permanecem apenas como compatibilidade operacional
- o hub mostra carreira, rotina, partida ativa e sessão compartilhada no mesmo ponto de entrada

### 2.4 Camada visual MVP oficial
- card de mundo do jogador
- card de agenda da semana
- card forte de sessão multiplayer
- card de elenco por lado
- card de preparação do confronto
- card de partida com identidade visual mais forte
- separação entre domínio, view models e renderers

### 2.5 Linguagem visual oficial da partida
A partida no Telegram possui **dois modos visuais oficiais**:

#### A. Cena de confronto
Usada para lances de tensão, duelo e impacto direto.

Exemplos:
- drible
- duelo defensivo
- chute
- defesa do goleiro
- gol
- rebote
- pênalti
- disputa ofensiva forte em bola parada

#### B. Cena de campo
Usada para organização, posse e leitura tática simples.

Exemplos:
- passe recebido
- passe interceptado
- circulação
- movimentação simples
- progressão sem duelo direto
- fallback genérico

### 2.6 Regra funcional da imagem
Na partida, a imagem não é acessório.  
Ela é parte da atualização do lance.

Toda implementação nova de lances deve definir:

- tipo do lance
- modo visual oficial
- renderer oficial
- legenda curta do lance

### 2.7 Restrição de produto
Não faz parte da experiência final oficial:

- placeholder card como saída principal da partida
- card técnico genérico substituindo a cena do lance
- HUD dominando visualmente a atualização do lance

Placeholder pode existir apenas como:

- fallback técnico
- ferramenta de teste
- etapa provisória claramente identificada

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
- política visual oficial da partida respeitada pelo renderer do Telegram

---

## 5. Critérios de aceite deste estado

O estado atual só é válido porque:

1. Fase 1 continua funcional
2. Fase 2 continua funcional
3. a modelagem multiplayer suporta mais de 2 participantes
4. a sessão diferencia lados, papéis de elenco e tipo do participante
5. a apresentação visual acompanha a regra implementada
6. a documentação oficial já reflete a direção humano-first
7. o bot apresenta solo e sessão compartilhada como partes do mesmo MMORPG
8. slash commands continuam existentes, mas deixam de ser a navegação principal do jogador
9. a partida possui linguagem visual oficial documentada
10. novos lances devem mapear para cena de confronto ou cena de campo
11. placeholder não pode ser tratado como apresentação final do produto

---

## 6. Resultado esperado desta fase

Ao final desta fase, o TeleSoccer deve estar preparado para evoluir sem ambiguidade em três frentes:

- expansão da carreira e do mundo do jogador
- amadurecimento do lobby/sessão compartilhada
- fortalecimento da identidade visual oficial da partida no Telegram

A base desta fase deve permitir que o projeto evolua para a próxima etapa sem voltar a uma experiência fragmentada, técnica demais ou visualmente genérica.