# TeleSoccer - Arquitetura

## 1. Objetivo

Definir a arquitetura atual e a direção de crescimento do TeleSoccer.

---

## 2. Camadas principais

### 2.1 Interface
A interface principal do produto é o bot do Telegram.

Responsabilidades:
- receber entradas do usuário
- exibir respostas
- mostrar ações disponíveis
- apresentar feedback textual e visual

A interface não deve concentrar regra de domínio.

### 2.2 Domínio
O domínio concentra:

- regras da carreira
- regras da partida
- regras de turno
- regras de disciplina
- regras de lesão e energia
- regras de multiplayer MVP

### 2.3 Persistência
A persistência deve ficar desacoplada do domínio por repositórios.

Responsabilidades:
- salvar e recuperar jogadores
- salvar e recuperar partidas
- salvar turnos, eventos, lesões e suspensões
- salvar sessões multiplayer mínimas

### 2.4 Infraestrutura
Infraestrutura principal:

- Railway para execução online
- Prisma + PostgreSQL para persistência
- Telegram Bot API como canal principal

---

## 3. Arquitetura do jogo

### 3.1 Carreira
Fluxo persistido por usuário e jogador.

### 3.2 Partida
Fluxo persistido por partida, turnos e eventos.

### 3.3 Multiplayer MVP
Fluxo persistido por sessão compartilhada.

O multiplayer MVP deve ter uma camada própria de organização lógica, como lobby, convite ou participante, sem misturar tudo diretamente na camada Telegram.

### 3.4 Visual MVP
A camada visual deve ser tratada como apresentação, não como regra de domínio.

---

## 4. Regras arquiteturais obrigatórias

- domínio não deve depender do Telegram
- Telegram deve ser interface fina
- persistência deve respeitar contratos de repositório
- Fase 1 e Fase 2 não podem sofrer regressões
- soluções do MVP devem ser expansíveis para fases posteriores

---

## 5. Crescimento previsto

Depois do MVP completo, a arquitetura deve permitir evolução para:

- multiplayer mais amplo
- temporadas
- ligas
- clubes mais completos
- mercado de transferências
- visual mais avançado