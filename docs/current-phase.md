# TeleSoccer - Fase Atual

## Fase atual
**Fase 1 - Fundação jogável do jogador**

---

## 1. Objetivo

Implementar a base funcional da carreira do jogador no TeleSoccer.

Esta fase deve permitir que um usuário:

- crie seu jogador
- defina a base do personagem
- tenha atributos iniciais corretos
- realize treino individual semanal
- tente peneiras
- possa falhar e tentar novamente
- consiga entrar no profissional
- tenha histórico inicial persistido

---

## 2. Escopo fechado da fase

### 2.1 Criação do jogador
Implementar criação de jogador com:

- nome
- nacionalidade
- posição principal
- pé dominante
- altura
- peso
- visual
- idade inicial de 14 anos

### 2.2 Regras iniciais de atributos
Os atributos devem:

- começar baixos
- ser influenciados pela posição
- ser influenciados por altura
- ser influenciados por peso

### 2.3 Dinheiro pessoal
Implementar carteira pessoal do jogador.

Uso inicial do dinheiro:
- treino individual
- nova tentativa de peneira

### 2.4 Treino individual semanal
Implementar:

- 1 treino por semana do jogo
- melhora de 1 fundamento por vez
- custo em dinheiro
- perda do ciclo se não treinar

### 2.5 Peneiras
Implementar:

- tentativa de peneira
- custo fixo
- possibilidade de falha
- necessidade de treinar e tentar novamente
- aprovação para entrada no profissional

### 2.6 Entrada no profissional
Ao passar na peneira:

- vincular o jogador a um clube profissional
- registrar início da carreira profissional

### 2.7 Histórico básico
Registrar no histórico:
- criação do personagem
- treinos realizados
- tentativas de peneira
- aprovações e reprovações
- entrada no profissional

---

## 3. Fora de escopo nesta fase

Não implementar agora:

- partidas completas por turnos
- técnico
- dono de clube
- criação de clube por usuário
- contrato completo
- transferências
- empréstimos
- ligas completas
- temporadas completas
- seleções
- lesões em partida
- sistema completo de energia em partida
- copas internacionais
- formação tática
- entrosamento coletivo

Esses itens pertencem a fases posteriores.

---

## 4. Entidades mínimas esperadas

Sugestão mínima de entidades para esta fase:

- User
- Player
- PlayerCareer
- PlayerAttribute
- PlayerGeneration
- Wallet
- TrainingSession
- TryoutAttempt
- Club
- ClubMembership

A estrutura exata deve respeitar a arquitetura atual do repositório.

---

## 5. Regras de negócio obrigatórias

### Jogador
- começa com 14 anos
- começa com atributos baixos
- escolhe posição principal
- escolhe pé dominante entre direito e esquerdo
- escolhe nacionalidade
- escolhe altura e peso

### Treino
- 1 treino individual por semana
- custo em dinheiro
- melhora 1 fundamento
- não melhora múltiplos fundamentos no mesmo treino
- se perder a semana, não recupera

### Peneira
- custo fixo
- pode falhar
- se falhar, precisa treinar e tentar novamente
- se passar, entra no profissional

### Renascimento
Ainda não precisa implementar o fluxo completo nesta fase, mas a modelagem deve ser pensada para suportar:
- múltiplas vidas
- pontos herdados
- nova geração do jogador

---

## 6. Fluxos do usuário que precisam existir

### Fluxo 1 - Criar jogador
Usuário entra no fluxo de criação e conclui o cadastro do atleta.

### Fluxo 2 - Ver ficha
Usuário vê os dados principais do jogador.

### Fluxo 3 - Treinar
Usuário escolhe um fundamento, paga e executa o treino da semana.

### Fluxo 4 - Tentar peneira
Usuário paga a taxa e tenta uma peneira.

### Fluxo 5 - Ver resultado da peneira
Usuário vê se foi reprovado ou aprovado.

### Fluxo 6 - Entrar no profissional
Usuário aprovado passa a integrar um clube profissional.

---

## 7. Impacto esperado no banco

Esta fase deve deixar o banco pronto para:

- múltiplos jogadores por gerações futuras
- evolução por fundamentos
- histórico de treino
- histórico de peneiras
- vínculo com clube
- expansão posterior para contratos e partidas

---

## 8. Impacto esperado no bot Telegram

O bot deve conseguir, no mínimo:

- iniciar criação do jogador
- salvar criação
- mostrar ficha do jogador
- oferecer treino semanal
- oferecer tentativa de peneira
- mostrar resultado
- mostrar status de carreira

---

## 9. Critérios de aceite

A fase só deve ser considerada pronta quando:

1. o usuário conseguir criar um jogador sem inconsistência
2. os atributos iniciais forem aplicados corretamente
3. o treino semanal respeitar custo e limite
4. a peneira tiver custo e resultado persistido
5. o jogador puder falhar e tentar de novo
6. o jogador puder passar e ser vinculado ao profissional
7. tudo estiver persistido corretamente no banco
8. os fluxos do bot estiverem funcionais
9. a implementação respeitar a arquitetura existente

---

## 10. Diretriz de implementação

Ao implementar esta fase:

- não inventar sistemas de fases futuras
- não misturar partidas completas nesta etapa
- não acoplar regras de domínio ao Telegram desnecessariamente
- não remover nada existente sem avisar
- manter a solução simples, robusta e expansível

---

## 11. Tarefa padrão para Codex/GPT

Ao receber uma tarefa relacionada a esta fase, trabalhar nesta ordem:

1. modelagem de dados
2. serviços de domínio
3. persistência
4. integração com bot
5. validação mínima
6. atualização da documentação se necessário