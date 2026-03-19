# TeleSoccer - Visual MVP

## 1. Objetivo

Dar ao TeleSoccer uma apresentação mínima claramente percebida como jogo online entre humanos, sem introduzir interface pesada fora do escopo.

## 2. Regra visual desta etapa

A camada visual MVP precisa reforçar a direção oficial do produto:
- multiplayer é sessão online real
- participantes humanos são o centro da experiência
- bot é fallback, não padrão

## 3. O que entra agora

- card textual de partida
- card textual de lobby multiplayer
- renderização de política humano-primeiro
- renderização de participantes humanos e vagas abertas
- renderização de elegibilidade de fallback com bot
- estrutura de renderer separada da regra de negócio

## 4. Impacto no bot Telegram

As mensagens devem:
- ficar mais legíveis
- comunicar que a sala representa uma sessão online persistida
- evitar linguagem de single-player com adendo multiplayer
- deixar claro quando houver vaga humana aberta e quando bot seria apenas contingência

## 5. O que não entra agora

- front-end web completo
- dashboard visual externo
- animações
- componentes gráficos pesados
- sistema visual independente do Telegram

## 6. Critério arquitetural

A regra continua no domínio.
O bot recebe dados já resolvidos e apenas usa renderers para transformar o estado em apresentação mínima.

## 7. Próximos passos compatíveis

- cards de carreira
- cards de treino
- cards de resultado de partida
- cards de matchmaking simples
- camada visual web leve consumindo os mesmos view models
