# TeleSoccer - Game Design do MVP atual

## 1. Fantasia oficial do produto

O TeleSoccer é um jogo de futebol online via Telegram centrado em jogadores humanos reais.

O usuário vive a carreira do próprio personagem e, progressivamente, participa de experiências compartilhadas com outros humanos.

Bots existem apenas para contingência operacional quando faltarem pessoas suficientes.

## 2. Loop central atual

1. criar jogador
2. evoluir com treino e peneira
3. entrar no profissional
4. jogar partida solo por turnos
5. abrir ou entrar em sessão online com humanos
6. preparar a futura partida multiplayer compartilhada

## 3. Regra de experiência

### Humanos primeiro
- o jogo deve tentar reunir pessoas reais antes de qualquer fallback
- a identidade do jogador humano precisa continuar sendo o centro da experiência

### Bots como fallback
- bot não substitui o objetivo do produto
- bot é apoio de contingência para não bloquear o fluxo quando faltar gente
- a experiência futura deve sempre priorizar humano quando disponível

## 4. Papel do multiplayer MVP no design

O multiplayer MVP não é extra decorativo.
Ele é a primeira forma oficial de sessão online persistida entre jogadores reais, já preparada para:
- distinguir humano e bot
- marcar necessidade de fallback
- evoluir para partida compartilhada

## 5. Impacto visual desejado

Mesmo no Telegram, a leitura deve parecer jogo e não apenas texto administrativo.
Por isso os cards atuais já mostram:
- sessão online
- participantes humanos
- vagas abertas
- fallback com bot apenas como contingência

## 6. Fora do design atual

Ainda não fazem parte do design ativo desta etapa:
- gestão completa de clube
- economia contratual profunda
- competição online formal completa
- interface externa ao Telegram como experiência principal
- partida multiplayer completa em tempo real
