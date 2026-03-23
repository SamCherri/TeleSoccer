# TeleSoccer - Linguagem Visual da Partida

## 1. Objetivo

Este documento define a **linguagem visual oficial da partida** no TeleSoccer.

Ele existe para orientar implementação, revisão técnica e decisões de produto ligadas à apresentação dos lances no Telegram.

A imagem do lance faz parte da experiência jogável.  
Ela não deve ser tratada apenas como decoração ou complemento opcional.

---

## 2. Princípio central

Na partida do TeleSoccer:

- cada lance relevante deve ter uma imagem principal
- o tipo do lance define o tipo da imagem
- a imagem deve comunicar o momento antes mesmo do jogador ler toda a legenda
- texto e botões complementam a cena, mas não substituem a cena

A experiência final deve parecer **um jogo de futebol narrado por imagens**, e não um relatório técnico com ilustração auxiliar.

---

## 3. Modos visuais oficiais

Existem dois modos visuais oficiais para a partida:

### 3.1 Cena de confronto
Usada quando o lance tem tensão, duelo, impacto ou individualização forte.

Características:
- imagem mais dramática
- foco nos personagens principais do lance
- leitura emocional imediata
- sensação de ação direta

Exemplos típicos:
- atacante contra zagueiro
- drible em progressão
- bote defensivo
- finalização
- goleiro contra atacante
- gol
- rebote
- pênalti

### 3.2 Cena de campo
Usada quando o lance é mais tático, coletivo ou de organização.

Características:
- leitura espacial do campo
- destaque do jogador com posse ou receptor da bola
- foco em setor, circulação e progressão
- sensação de construção da jogada

Exemplos típicos:
- jogador recebe a bola
- passe simples
- passe interceptado
- troca de setor
- posse no meio-campo
- construção ofensiva
- movimentação sem confronto direto
- fallback genérico

---

## 4. Regra de classificação

Todo lance implementado deve ser classificado em um dos dois modos:

- `hero-scene`
- `field-scene`

Essa classificação deve ser feita de forma explícita.

Não é aceitável implementar um novo tipo de lance sem também definir:

- qual é o modo visual oficial
- qual é a legenda curta esperada
- qual renderer deve ser usado

---

## 5. Mapeamento visual recomendado

### 5.1 Lances de confronto
Mapear para `hero-scene`:

- `dribble`
- `defensive-duel`
- `shot`
- `goalkeeper-save`
- `goal`
- `rebound`
- `penalty-kick`

### 5.2 Lances de campo
Mapear para `field-scene`:

- `pass-received`
- `pass-intercepted`
- `fallback`

### 5.3 Regra para bola parada
- escanteio pode ser `field-scene` quando o foco for organização e trajetória
- escanteio pode ser `hero-scene` quando o foco for disputa dentro da área

### 5.4 Regra para expansão futura
Novos lances devem seguir a mesma lógica:

#### usar `hero-scene` quando:
- houver 1 contra 1 forte
- houver finalização
- houver defesa
- houver disputa física clara
- houver momento de alto impacto emocional

#### usar `field-scene` quando:
- houver circulação
- houver organização coletiva
- houver recepção de bola
- houver deslocamento sem contato direto
- houver leitura de setor e posicionamento

---

## 6. Hierarquia da atualização do lance

A atualização da partida no Telegram deve obedecer esta ordem de importância:

1. imagem principal do lance
2. legenda curta do lance
3. placar e contexto essencial
4. botões de ação

Não inverter essa hierarquia.

A imagem é o núcleo da leitura do momento.

---

## 7. Regra de legenda

A legenda deve ser:

- curta
- direta
- forte
- fácil de entender rapidamente
- alinhada ao tipo da imagem

### 7.1 Boas legendas para `hero-scene`
- “Samuel encara Eduardo no duelo individual!”
- “Samuel parte para o drible!”
- “Eduardo chega firme no bote!”
- “Samuel finaliza contra o goleiro!”
- “O goleiro salva no reflexo!”
- “A bola sobra viva na área!”

### 7.2 Boas legendas para `field-scene`
- “Henrique recebe aberto pela direita!”
- “A posse gira pelo meio-campo.”
- “O time tenta acelerar pelo corredor.”
- “A bola troca de lado.”
- “O passe encontra espaço no setor ofensivo.”

### 7.3 Evitar
- parágrafos longos
- excesso de números
- linguagem burocrática
- descrição técnica demais
- HUD textual dominando a mensagem

---

## 8. Restrições obrigatórias

Não usar como apresentação final oficial da partida:

- placeholder card genérico
- composição pesada com múltiplos painéis concorrendo com a cena principal
- imagem que funcione mais como dashboard do que como lance
- renderização que misture arte hero, mini-campo, painel técnico e texto longo sem hierarquia clara

Placeholder pode existir apenas como:

- fallback técnico
- etapa temporária de desenvolvimento
- ferramenta interna de prototipagem

Nunca como padrão final do produto.

---

## 9. Diretriz para renderers

Os renderers da partida devem ser organizados de forma que o modo visual do lance seja uma decisão explícita.

Estrutura esperada:

- domínio define o tipo do lance
- camada de apresentação define o modo visual
- renderer correto gera a cena correspondente
- Telegram recebe a imagem final do lance

A infraestrutura não deve escolher um layout genérico por conveniência quando já existir classificação visual definida.

---

## 10. Diretriz para arte

A arte deve reforçar a leitura imediata do tipo de lance.

### 10.1 Para `hero-scene`
- enquadramento próximo
- jogadores principais bem identificáveis
- sensação de impacto
- ação clara
- fundo subordinado ao duelo

### 10.2 Para `field-scene`
- visão ampla do campo
- distribuição dos jogadores legível
- destaque do portador ou receptor da bola
- boa leitura do setor
- clareza tática acima do drama

---

## 11. Objetivo de produto

O TeleSoccer deve passar esta sensação:

- quando há confronto, o usuário sente tensão
- quando há posse e organização, o usuário entende o mapa do jogo
- quando a atualização chega no Telegram, o usuário reconhece rapidamente o tipo do momento

A linguagem visual oficial existe para transformar a partida em algo com identidade própria.

---

## 12. Regra final

Sempre que houver dúvida entre:

- mostrar mais dados
- ou preservar a clareza visual do lance

priorizar:

1. tipo de cena correto
2. leitura rápida
3. impacto do momento
4. consistência com a identidade do TeleSoccer

O lance deve parecer um momento jogável de futebol, não uma tela técnica genérica.