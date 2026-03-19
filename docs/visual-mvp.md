# TeleSoccer - Visual MVP

## 1. Objetivo

Dar ao TeleSoccer uma apresentação mínima mais claramente percebida como jogo, sem introduzir interface pesada fora do escopo.

## 2. Decisão desta entrega

A opção adotada é uma combinação de:
- **melhoria do formato visual das mensagens de jogo**
- **contratos/renderers reutilizáveis para cards textuais**

## 3. O que entra agora

- card textual de partida
- card textual de lobby multiplayer
- estrutura de renderer separada da regra de negócio
- mensagens prontas para Telegram com leitura mais rápida

## 4. O que não entra agora

- front-end web completo
- dashboard visual externo
- animações
- componentes gráficos pesados
- sistema visual independente do Telegram

## 5. Critério arquitetural

A regra continua no domínio.
O bot recebe dados já resolvidos e apenas usa renderers para transformar o estado em apresentação mínima.

## 6. Próximos passos compatíveis

- cards de carreira
- cards de treino
- cards de resultado de partida
- camada visual web leve consumindo os mesmos view models
