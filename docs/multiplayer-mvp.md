# TeleSoccer - Multiplayer MVP

## 1. Objetivo

Definir a forma mínima e funcional de multiplayer do TeleSoccer antes da Fase 3.

---

## 2. Princípio

O multiplayer MVP deve ser simples, online e coerente.

Ele não precisa ser massivo nem em tempo real contínuo, mas precisa permitir que dois usuários humanos compartilhem a mesma experiência de partida.

---

## 3. Escopo do multiplayer MVP

### 3.1 Formato inicial
Implementar apenas o formato mais simples possível, por exemplo:

- amistoso entre dois usuários
ou
- sessão compartilhada entre dois usuários em uma partida por turnos

### 3.2 Entrada na partida
O multiplayer MVP deve suportar ao menos um destes fluxos:

- convite por código
- convite direto por comando
- lobby simples com criação e entrada

### 3.3 Participantes
No MVP inicial:

- 2 usuários humanos no máximo por sessão jogável principal
- cada usuário deve ter identidade persistida
- o estado da sessão deve ser compartilhado e persistido

### 3.4 Turnos
Os turnos precisam ser coerentes para os participantes.

O sistema deve definir claramente:

- quem age primeiro
- quando o outro usuário recebe atualização
- como funciona timeout por participante
- o que acontece se um usuário não responder

### 3.5 Saída, abandono e ausência
Definir regra mínima para:

- convite expirado
- usuário que não entra
- abandono da partida
- timeout recorrente
- derrota técnica ou encerramento automático

---

## 4. O que não entra agora

- matchmaking complexo
- ranking completo
- filas públicas avançadas
- times completos com vários humanos
- sala com muitos espectadores
- chat interno sofisticado
- campeonato multiplayer completo

---

## 5. Critérios de aceite

O multiplayer MVP só está pronto quando:

1. dois usuários humanos conseguirem entrar na mesma sessão
2. ambos receberem estado coerente da mesma partida
3. os turnos forem respeitados
4. timeout funcionar para a sessão compartilhada
5. a partida puder ser encerrada corretamente
6. o estado persistido puder ser consultado sem inconsistência