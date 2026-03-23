# TeleSoccer - Regras do Jogo

## 1. Visão geral

O TeleSoccer é um jogo de futebol via bot do Telegram.

A base do projeto é a carreira de um jogador controlado por usuário. O jogo evolui por fases até se tornar um universo completo de futebol com:

- jogadores
- técnicos
- donos de clubes
- clubes
- divisões
- copas
- seleções
- mercado
- temporadas
- progressão por gerações

---

## 2. Papel inicial do usuário

O usuário começa como **jogador**.

Na fase inicial:
- controla um único personagem
- controla somente o próprio personagem nas partidas
- não controla o time inteiro durante o jogo

Papéis futuros:
- técnico
- dono de clube
- técnico de seleção

---

## 3. Ciclo de vida do personagem

### Início
- o personagem começa com **14 anos**

### Carreira como jogador
- pode jogar até **40 anos**

### Vida no futebol após a aposentadoria
- pode continuar no universo do futebol até **65 anos**, em funções futuras

### Renascimento
Após a aposentadoria:
- o personagem renasce com **14 anos**
- recebe **1% da vida anterior em pontos livres**
- esses pontos podem ser distribuídos logo na criação da nova vida

Objetivo:
- criar progressão permanente por gerações
- permitir builds diferentes a cada nova vida

---

## 4. Criação do jogador

O usuário pode definir:

- nome
- visual
- nacionalidade
- posição principal
- pé dominante
- altura
- peso/porte físico

### Regras da criação
- o nome deve respeitar moderação
- sem caracteres especiais
- sem apelido separado
- a nacionalidade é suficiente por enquanto
- cidade de origem não é necessária
- o número da camisa é definido pelo clube ou sistema

### Pé dominante
Opções iniciais:
- direito
- esquerdo

### Posições
Todas as posições do futebol estão disponíveis desde o início.

O jogador escolhe uma posição principal.

No futuro, poderá desbloquear outras posições com custo.

---

## 5. Atributos

### Base inicial
O jogador começa com atributos **bem baixos**.

A distribuição inicial depende de:
- posição
- altura
- peso/porte físico

### Filosofia de progressão
- sem nível geral
- sem barra de XP
- evolução automática por ações executadas
- evolução manual com pontos livres
- sem queda de atributos por desuso

### Regra principal
O jogador melhora naquilo que:
- treina
- executa nas partidas
- pratica de forma recorrente

---

## 6. Treino

## 6.1 Treino individual

Existe treino individual.

Regras:
- custa dinheiro pessoal do jogador
- não consome energia física
- melhora apenas **1 fundamento por vez**
- pode ser feito **1 vez por semana do jogo**
- pode ser feito a qualquer momento da semana
- se não fizer, perde a oportunidade daquela semana

Não existem por enquanto:
- academia separada
- preparo físico separado
- treino especial de recuperação de lesão

### Treinos por fundamento
Exemplos:
- passe
- chute
- drible
- velocidade
- marcação

### Goleiros
Goleiros têm treinos específicos próprios.

---

## 6.2 Treino coletivo

Existe treino coletivo.

Regras:
- decidido pelo técnico
- influencia o desempenho coletivo do time
- influencia também a evolução individual dos jogadores
- ajuda no entrosamento

---

## 7. Entrada na carreira

O jogador começa por **peneiras regionais**.

### Peneiras
- o resultado depende de decisões do usuário
- essas decisões são ações de jogo dentro de lances
- se falhar na peneira, o jogador precisa:
  - treinar
  - pagar nova tentativa

### Nova tentativa
- a nova tentativa de peneira custa dinheiro
- a taxa é igual para todos

### Aprovação
Se passar:
- entra direto no profissional

---

## 8. Dinheiro

## 8.1 Dinheiro pessoal do jogador

Existe dinheiro pessoal separado do dinheiro do clube.

Pode ser usado para:
- treino individual
- novas tentativas de peneira
- itens
- cosméticos

## 8.2 Dinheiro do clube

Existe economia separada do clube.

Ela será usada para:
- contratos
- salários
- transferências
- gestão esportiva
- comissão técnica
- expansão do clube

---

## 9. Partidas

## 9.1 Estrutura geral
As partidas são:
- online
- por turnos
- jogadas no Telegram

### Duração
- 90 minutos simulados
- 2 tempos de 45
- com acréscimos calculados conforme os eventos da partida

### Mata-mata
Se houver empate:
- prorrogação
- se continuar empatado, pênaltis

### Simplificações aprovadas
- sem impedimento por enquanto

---

## 9.2 Lances

O jogador só toma decisão quando a bola chega nele.

O sistema mostra:
- contexto curto do lance
- ações válidas para o contexto
- botões simples

Exemplos de contexto:
- recebeu pressionado
- recebeu livre
- recebeu de costas para o gol
- recebeu na área

### Resultado da ação
O resultado aparece imediatamente no lance.

### Tempo por turno
- 30 segundos por lance
- se o usuário não responder:
  - perde o lance
  - o adversário fica com a posse e continuidade da jogada

---

## 9.3 Combinação de ações

Em determinados lances, o jogador pode combinar até **2 ações**.

Exemplo:
- dominar + driblar
- olhar + passar
- correr + finalizar

---

## 9.4 Resultado da jogada

O resultado de uma ação depende de:
- atributos do jogador
- condição física
- situação do lance
- fator aleatório

---

## 9.5 Informações visíveis na partida

Cada atualização deve mostrar:
- placar
- tempo de jogo
- contexto curto do lance
- resultado da ação anterior quando houver

Não mostrar:
- estimativa explícita de risco

---

## 9.6 Linguagem visual dos lances

A partida no Telegram deve usar uma **linguagem visual oficial**.

Cada atualização relevante de lance deve ter uma imagem principal adequada ao tipo do momento.

A imagem do lance é parte do gameplay e não apenas decoração.

### Modos visuais oficiais

#### A. Cena de confronto
Usada quando há duelo direto, tensão, finalização ou impacto dramático.

Exemplos:
- drible contra marcador
- disputa defensiva
- finalização
- defesa do goleiro
- gol
- rebote
- pênalti
- disputa forte em escanteio ofensivo

#### B. Cena de campo
Usada quando o momento é coletivo, tático ou de organização.

Exemplos:
- jogador recebe a bola
- passe simples
- troca de lado
- circulação de posse
- avanço sem contato direto
- lance genérico de construção

### Regra obrigatória
Todo tipo de lance deve mapear para um modo visual oficial.

A implementação de um novo lance deve definir:
- classificação do lance
- modo visual
- legenda curta esperada
- renderer oficial

### Proibição
Não usar placeholder como experiência final oficial da partida.

Placeholder pode existir apenas como:
- fallback técnico
- teste interno
- etapa provisória explicitamente marcada

---

## 9.7 Legendas da imagem do lance

A legenda da imagem deve ser:

- curta
- objetiva
- forte
- centrada no ator principal e na ação principal

### Boas referências de legenda
- “Samuel encara Eduardo no duelo individual!”
- “Henrique recebe aberto pela direita!”
- “Samuel finaliza contra o goleiro!”
- “A bola gira pelo meio-campo.”

### Evitar
- bloco longo de texto
- linguagem de relatório
- excesso de HUD textual
- repetir informação demais que a imagem já mostra

---

## 10. Regras de futebol presentes

Estão incluídas na base:

- falta
- cobrança de falta
- pênalti
- escanteio
- tiro de meta
- lateral
- substituições
- cartões
- suspensões

### Cartões
- vermelho suspende automaticamente a próxima partida
- 3 amarelos geram suspensão automática

### Histórico disciplinar
Registrar:
- amarelos
- vermelhos
- suspensões
- faltas

---

## 11. Lesões e energia

## 11.1 Lesão
Existe lesão.

Pode acontecer por:
- aleatoriedade
- tipo de lance
- desgaste

A recuperação é medida por **número de partidas**, não por tempo real.

O efeito da lesão depende da gravidade:
- pode impedir o atleta de jogar
- ou permitir atuação com limitação

## 11.2 Energia física
Existe energia física.

Ela cai por:
- esforço durante a partida
- sequência de jogos
- idade/carreira

A recuperação é automática com o descanso entre partidas.

Não há, por enquanto:
- moral
- ânimo
- confiança como sistema separado

---

## 12. Goleiro

O goleiro pode ser controlado por usuário.

Quando a bola chega nele, ele recebe decisões próprias.

Exemplos:
- defender
- espalmar
- segurar
- sair do gol
- rebater
- repor com a mão
- repor com o pé

---

## 13. Cobranças manuais

### Pênalti
Batedor escolhe:
- lado
- altura

Goleiro escolhe:
- lado
- altura

### Falta direta
Jogador escolhe:
- lado
- altura

### Escanteio
Jogador escolhe:
- lado
- altura

### Lateral
Sem cobrança manual por enquanto.

---

## 14. Histórico e recordes

## 14.1 Histórico de carreira
Registrar:
- clubes
- partidas
- gols
- assistências
- títulos
- lesões
- cartões
- prêmios

## 14.2 Recordes
Existem recordes por:
- carreira
- clube
- liga
- seleção

---

## 15. Seleções

Existe seleção nacional.

### Convocação
A convocação é feita pelo **técnico da seleção**.

Na fase inicial:
- o técnico da seleção é IA

No futuro:
- usuários podem assumir esse papel

### Competições
Haverá competições de seleções.

---

## 16. Clubes

## 16.1 Dono de clube
Quem exerce esse papel pode:
- criar clube
- definir identidade do clube
- gerir administração
- gerir contratações
- gerir finanças
- controlar decisões amplas do clube

## 16.2 Criação do clube
O dono pode definir:
- nome
- escudo
- cores
- uniforme
- cidade
- país

## 16.3 Entrada do clube nas divisões
O clube entra sempre na **divisão mais baixa disponível** do país escolhido.

Se a última divisão estiver cheia:
- cria-se uma nova divisão abaixo

Cada divisão tem:
- 20 clubes

## 16.4 Elenco inicial do clube
O clube novo começa com:
- base mínima gerada pelo sistema
- jogadores genéricos fracos
- vagas para contratações futuras

## 16.5 Técnico inicial
O clube pode:
- começar com técnico gerado pelo sistema
- depois contratar um técnico usuário

---

## 17. Técnico

O técnico é responsável por:
- escalação
- substituições
- formação tática
- estilo de jogo
- treino coletivo

### Formação
Exemplos:
- 4-4-2
- 4-3-3
- 3-5-2
- 4-2-3-1

### Estilo de jogo
Exemplos:
- defensivo
- equilibrado
- ofensivo
- posse
- contra-ataque

### Influência na partida
O estilo e a formação influenciam:
- tipo de lance gerado
- contexto que aparece ao jogador
- comportamento coletivo do time

### Pré-jogo
O jogador pode ver antes da partida:
- instruções táticas
- adversário
- força do adversário por setor
- jogadores mais perigosos do adversário
- goleiro adversário

---

## 18. Entrosamento

Existe entrosamento.

Na fase inicial:
- é um valor geral do time

Ele cresce por:
- partidas jogadas juntos
- treino coletivo

Ele influencia:
- qualidade dos passes e jogadas coletivas
- posicionamento
- entendimento tático

---

## 19. Contratos

O contrato profissional existe somente quando o jogador entra no clube profissional.

O clube define:
- salário
- duração
- multa rescisória
- cláusulas extras
- bônus

O jogador:
- pode ver todos os detalhes antes de aceitar
- pode aceitar ou recusar
- pode recusar renovação
- pode pedir transferência

### Salário
- pago por mês do jogo

### Cláusulas extras
Exemplos:
- bônus por gol
- bônus por assistência
- bônus por título
- bônus por clean sheet
- metas específicas

### Multa
- definida livremente pelo clube

---

## 20. Mercado

## 20.1 Transferência
O jogador pode pedir transferência.

O clube pode:
- aceitar
- recusar
- negociar condições

## 20.2 Venda definitiva
O clube decide a venda.

Mas o jogador ainda precisa aceitar o contrato do novo clube.

## 20.3 Empréstimo
Existe empréstimo.

O clube pode definir:
- duração
- quem paga o salário
- opção de compra

O jogador:
- não pode recusar o empréstimo

Ao fim do empréstimo:
- volta automaticamente ao clube de origem

---

## 21. Papéis e progressão de conta

## 21.1 Sem Premium
O usuário tem:
- apenas 1 conta

Após se aposentar como jogador, pode virar:
- técnico
- dono de clube, se tiver dinheiro suficiente para comprar direito de clube

## 21.2 Com Premium
O usuário pode ter:
- 1 conta de jogador
- 1 segunda conta adicional

A segunda conta pode ser:
- técnico
- dono de clube

Mas deve ser apenas **uma das duas**.

A conta de jogador e a conta Premium:
- não podem ser do mesmo time

---

## 22. Direito de clube

Existe um **direito de clube** para usuários sem Premium que queiram virar donos após a aposentadoria.

Regras:
- valor fixo
- extremamente difícil de alcançar
- permite criar clube novo do zero
- não serve para assumir clube existente

---

## 23. Ligas e divisões

### Brasil
Estrutura inicial:
- Série A
- Série B
- Série C

Cada uma com:
- 20 clubes

### Movimentação
- Série A: caem 4
- Série B: sobem 4 e caem 4
- Série C: sobem 4 e não caem por enquanto

### Expansão
Quando a divisão mais baixa lota:
- cria-se uma nova série abaixo
- sempre com 20 clubes
- a nova série também tem acesso de 4 clubes para a série acima

---

## 24. Expansão internacional

Prioridade inicial de países:
1. Brasil
2. Argentina
3. Espanha
4. demais países europeus

### Espanha
Estrutura inicial desejada:
- 3 divisões, como no Brasil

### Competições
A visão global é suportar:
- ligas
- copas
- campeonatos inspirados na lógica real do futebol mundial

Isso deve ser implementado por fases.

---

## 25. Sistemas que ficam fora por enquanto

Não entram na fase inicial:

- impedimento
- capitão
- moral/confiança
- reputação/fama
- atributos mentais separados
- categorias de base completas de clube
- agente/empresário
- olheiro
- lateral manual
- academia separada

---

## 26. Regra de implementação

Toda nova feature deve respeitar:

1. regra de negócio
2. fluxo do usuário
3. impacto no banco
4. integração com bot
5. impacto visual
6. expansão futura sem quebrar a base
7. consistência com a linguagem visual oficial da partida