
# TeleSoccer - Fluxos do Bot Telegram

## 1. Objetivo deste documento

Este documento define os fluxos principais do bot do Telegram no TeleSoccer.

A ideia é organizar:
- comandos
- menus
- navegação
- respostas do sistema
- interações por botões

---

## 2. Princípios dos fluxos do bot

Os fluxos do bot devem ser:

- curtos
- claros
- fáceis de navegar
- compatíveis com teclado inline
- orientados por contexto
- sem excesso de texto por tela
- sem lógica pesada dentro do handler

---

## 3. Regras gerais da interface

## 3.1 Botões
Sempre que possível, usar botões simples.

Exemplos:
- Criar jogador
- Ver ficha
- Treinar
- Tentar peneira
- Ver carreira
- Ver contrato

## 3.2 Texto
As mensagens devem:
- informar o contexto
- mostrar o estado atual
- indicar a próxima ação possível

## 3.3 Navegação
Sempre que possível, oferecer:
- voltar
- cancelar
- confirmar

---

## 4. Fluxo principal inicial

## 4.1 Fluxo de entrada do usuário

### Objetivo
Descobrir se o usuário já tem jogador ou não.

### Resultado esperado
- se não tiver jogador, oferecer criação
- se já tiver jogador, abrir menu principal

### Exemplo de mensagem
```text
Bem-vindo ao TeleSoccer.
Você ainda não criou seu jogador.

O que deseja fazer?
Botões
Criar jogador
Sair
5. Fluxo de criação do jogador
5.1 Objetivo
Permitir criar o personagem inicial.
5.2 Etapas sugeridas
nome
nacionalidade
posição principal
pé dominante
altura
peso
visual
confirmação final
Observação
A idade inicial será automática:
14 anos
5.3 Passo a passo sugerido
Etapa 1 - Nome
Mensagem:
Plain text
Escolha o nome do seu jogador.
Regras:
sem caracteres especiais
moderado pelo sistema
Etapa 2 - Nacionalidade
Mensagem:
Plain text
Escolha a nacionalidade do seu jogador.
Etapa 3 - Posição
Mensagem:
Plain text
Escolha a posição principal do seu jogador.
Botões sugeridos:
Goleiro
Zagueiro
Lateral Direito
Lateral Esquerdo
Volante
Meia
Ponta
Atacante
Etapa 4 - Pé dominante
Mensagem:
Plain text
Escolha o pé dominante.
Botões:
Direito
Esquerdo
Etapa 5 - Altura
Mensagem:
Plain text
Escolha a altura do seu jogador.
Etapa 6 - Peso
Mensagem:
Plain text
Escolha o porte físico do seu jogador.
Etapa 7 - Visual
Mensagem:
Plain text
Defina a aparência do seu jogador.
Etapa 8 - Confirmação
Mensagem:
Plain text
Confira os dados do seu jogador antes de confirmar.
Botões:
Confirmar
Refazer
Cancelar
6. Fluxo de menu principal do jogador
6.1 Objetivo
Apresentar os acessos principais depois da criação.
Estrutura sugerida
Mensagem:
Plain text
Mundo do jogador
Nome: ...
Idade: ...
Posição: ...
Clube: ...
Momento: ...
Dinheiro: ...
Ambiente atual: ...
Botões
Continuar jornada
Ver agenda da semana
Ir ao centro de treinamento
Entrar no vestiário
Convites e oportunidades
Entrar no estádio

## 6.2 Hub MMORPG unificado

### Objetivo
Reunir carreira, partida ativa e sessão compartilhada em um único ponto de navegação.

### Navegação principal
- botões contextuais
- cards de ambiente
- recomendações de próximo passo

### Compatibilidade
- `/mmorpg` como atalho operacional
- `/multiplayer` como alias compatível

### Conteúdo esperado
- resumo do jogador
- ambiente atual
- rotina da semana
- status da partida ativa, se existir
- status da sessão compartilhada, se existir
- atalhos naturais para estádio, centro de treinamento, vestiário e convites
7. Fluxo de ficha do jogador
7.1 Objetivo
Exibir os dados principais do personagem.
Informações mínimas
nome
idade
nacionalidade
posição principal
pé dominante
altura
peso
clube atual
atributos principais
dinheiro pessoal
geração atual
Botões
Treinar
Ver carreira
Voltar
8. Fluxo de treino individual
8.1 Objetivo
Permitir o treino semanal.
Pré-validações
ainda não treinou na semana
tem dinheiro suficiente
Tela de escolha do treino
Mensagem:
Plain text
Escolha qual fundamento deseja treinar nesta semana.
Botões sugeridos
Passe
Finalização
Drible
Velocidade
Marcação
Defesa (se goleiro)
Cancelar
Confirmação
Mensagem:
Plain text
Esse treino custa X moedas.
Deseja continuar?
Botões:
Confirmar treino
Cancelar
Resultado
Mensagem:
Plain text
Treino concluído com sucesso.
Seu fundamento evoluiu.
Caso tenha treinado na semana
Mensagem:
Plain text
Você já utilizou o treino individual desta semana.
9. Fluxo de peneira
9.1 Objetivo
Permitir tentar entrar no profissional.
Pré-validações
tem dinheiro suficiente para a taxa
está elegível para tentar
Entrada
Mensagem:
Plain text
Você deseja participar de uma peneira.
Essa tentativa custa X moedas.
Botões:
Tentar peneira
Cancelar
Resultado possível 1 - Reprovação
Mensagem:
Plain text
Você não foi aprovado na peneira.
Treine e tente novamente no futuro.
Botões:
Treinar
Voltar
Resultado possível 2 - Aprovação
Mensagem:
Plain text
Parabéns. Você foi aprovado e entrou no profissional.
Botões:
Ver clube
Ver carreira
Voltar ao painel
10. Fluxo de carreira
10.1 Objetivo
Mostrar o estado atual da carreira do jogador.
Informações sugeridas
idade
clube atual
fase da carreira
partidas
gols
assistências
lesões
cartões
status contratual
histórico recente
Botões
Ver histórico
Ver contrato
Voltar
11. Fluxo de histórico
11.1 Objetivo
Mostrar eventos importantes da trajetória.
Eventos sugeridos
criação do jogador
treinos feitos
peneiras tentadas
aprovações
clubes
lesões
cartões
títulos
aposentadoria futura
renascimentos futuros
12. Fluxo de contrato
12.1 Objetivo
Mostrar o contrato atual do jogador.
Informações sugeridas
clube
salário mensal
duração
multa rescisória
cláusulas extras
bônus
Botões futuros
Pedir transferência
Ver propostas
Voltar
Na fase 1, esse fluxo pode existir apenas de forma básica ou ficar reservado para fase posterior.
13. Fluxo de pré-jogo
Este fluxo entra em fases posteriores.
Informações desejadas
adversário
força por setor
jogadores perigosos
goleiro adversário
instruções do técnico
papel do atleta em campo
14. Fluxo de partida por turnos
Este fluxo entra na fase de partidas.
Estrutura desejada por lance
Mensagem:
Plain text
Placar: Time A 1 x 0 Time B
Minuto: 37'
Contexto: você recebeu pressionado pela direita.
Botões de ação:
Passar
Driblar
Chutar
Dominar
Proteger bola
Regra
o sistema mostra só ações possíveis naquele contexto
o usuário tem 30 segundos
se não responder, perde o lance
15. Fluxo de goleiro
Também para fase posterior.
Exemplo de contexto
Plain text
Placar: Time A 0 x 0 Time B
Minuto: 81'
Contexto: chute forte no canto esquerdo.
Botões
Defender
Espalmar
Segurar
Rebater
16. Fluxo de cobranças manuais
Fases posteriores.
Pênalti
Mensagem:
Plain text
Escolha o lado e a altura da cobrança.
Falta
Mensagem:
Plain text
Escolha o lado e a altura da cobrança.
Escanteio
Mensagem:
Plain text
Escolha o lado e a altura do cruzamento.
17. Fluxo do técnico
Fase posterior.
Opções esperadas
escalar time
definir formação
definir estilo de jogo
treino coletivo
substituições
18. Fluxo do dono de clube
Fase posterior.
Opções esperadas
criar clube
editar identidade do clube
ver elenco
contratar técnico
contratar jogadores
gerir orçamento
ver divisões
19. Padrões recomendados para callbacks
Os callbacks devem ser previsíveis e legíveis.
Exemplos:
player:create:start
player:create:confirm
player:train:open
player:train:select:passing
tryout:start
tryout:confirm
career:view
history:view
A padronização facilita:
manutenção
debugging
evolução do bot
20. Diretriz final
Todo fluxo do Telegram deve ser pensado assim:
o usuário entende o contexto
o usuário vê poucas opções relevantes
o domínio decide a regra
o bot só apresenta o resultado
