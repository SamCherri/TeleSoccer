# TeleSoccer - Backlog do Projeto

## 1. Objetivo do backlog

Este backlog organiza as tarefas candidatas do TeleSoccer.

A ideia é:
- transformar a visão do jogo em trabalho concreto
- quebrar o projeto em entregas pequenas
- facilitar uso de Codex e GPT
- evitar tarefas gigantes e vagas

---

## 2. Regra de priorização

Prioridade sempre nesta ordem:

1. fundação do jogador
2. partida jogável
3. contratos e mercado
4. técnico e tática
5. dono de clube
6. ligas e temporadas
7. seleções
8. expansão internacional
9. refinamento e balanceamento

---

## 3. Backlog da Fase 1 - Fundação do jogador

## 3.1 Modelagem inicial
- [ ] criar modelagem Prisma de usuário
- [ ] criar modelagem Prisma de jogador
- [ ] criar modelagem Prisma de atributos do jogador
- [ ] criar modelagem Prisma de carteira pessoal
- [ ] criar modelagem Prisma de treino semanal
- [ ] criar modelagem Prisma de tentativa de peneira
- [ ] criar modelagem Prisma de vínculo inicial com clube
- [ ] preparar modelagem para gerações futuras do jogador

## 3.2 Domínio do jogador
- [ ] criar entidade de jogador
- [ ] criar regra de criação inicial do jogador
- [ ] criar cálculo de atributos iniciais por posição
- [ ] criar modificadores de altura
- [ ] criar modificadores de peso
- [ ] validar pé dominante
- [ ] validar nome do jogador
- [ ] validar nacionalidade
- [ ] aplicar idade inicial fixa de 14 anos

## 3.3 Serviços
- [ ] criar serviço de criação de jogador
- [ ] criar serviço de leitura da ficha do jogador
- [ ] criar serviço de treino semanal
- [ ] criar serviço de tentativa de peneira
- [ ] criar serviço de aprovação para o profissional
- [ ] criar serviço de carregamento do status de carreira

## 3.4 Bot Telegram
- [ ] criar fluxo `/start`
- [ ] criar fluxo de detecção de jogador existente
- [ ] criar fluxo de criação do jogador
- [ ] criar fluxo de confirmação final de criação
- [ ] criar menu principal do jogador
- [ ] criar tela de ficha do jogador
- [ ] criar tela de treino semanal
- [ ] criar tela de tentativa de peneira
- [ ] criar tela de resultado da peneira
- [ ] criar tela de status de carreira

## 3.5 Persistência
- [ ] criar repositório Prisma de jogador
- [ ] criar repositório Prisma de carteira
- [ ] criar repositório Prisma de treino
- [ ] criar repositório Prisma de peneira
- [ ] criar repositório Prisma de vínculo com clube

## 3.6 Validação
- [ ] impedir segundo treino na mesma semana
- [ ] impedir peneira sem dinheiro
- [ ] impedir criação duplicada indevida
- [ ] impedir nome inválido
- [ ] validar posição, pé dominante, altura e peso

---

## 4. Backlog da Fase 2 - Partida por turnos

- [ ] modelar partida
- [ ] modelar evento de partida
- [ ] modelar turno
- [ ] modelar posse
- [ ] modelar lance
- [ ] criar gerador de contexto do lance
- [ ] criar catálogo de ações por contexto
- [ ] criar resolução de ação
- [ ] criar timeout de 30 segundos
- [ ] criar perda automática de lance por timeout
- [ ] criar atualização de placar e tempo
- [ ] criar faltas
- [ ] criar pênaltis
- [ ] criar escanteios
- [ ] criar tiros de meta
- [ ] criar cartões
- [ ] criar suspensão automática
- [ ] criar lesões
- [ ] criar energia física
- [ ] criar controle de goleiro usuário

---

## 5. Backlog da Fase 3 - Contratos e mercado

- [ ] modelar contrato
- [ ] modelar cláusulas contratuais
- [ ] modelar salário mensal
- [ ] modelar multa rescisória
- [ ] modelar bônus
- [ ] criar oferta de contrato
- [ ] criar aceite de contrato
- [ ] criar recusa de contrato
- [ ] criar renovação
- [ ] criar recusa de renovação
- [ ] criar pedido de transferência
- [ ] criar venda definitiva
- [ ] criar empréstimo
- [ ] criar retorno automático ao clube de origem

---

## 6. Backlog da Fase 4 - Técnico e tática

- [ ] modelar técnico
- [ ] modelar formação
- [ ] modelar estilo de jogo
- [ ] modelar treino coletivo
- [ ] criar fluxo de escalação
- [ ] criar fluxo de substituição
- [ ] criar impacto do estilo nos lances
- [ ] criar impacto da formação nos lances
- [ ] criar instruções pré-jogo
- [ ] criar análise de força do adversário por setor

---

## 7. Backlog da Fase 5 - Dono de clube

- [ ] modelar dono de clube
- [ ] modelar direito de clube
- [ ] modelar criação de clube
- [ ] modelar identidade do clube
- [ ] criar fluxo de criação do clube
- [ ] criar geração de elenco mínimo
- [ ] criar contratação de técnico usuário
- [ ] criar orçamento do clube
- [ ] criar restrições Premium
- [ ] criar restrições de segunda conta

---

## 8. Backlog da Fase 6 - Ligas e temporadas

- [ ] modelar país
- [ ] modelar divisões
- [ ] modelar série expansível
- [ ] modelar temporada
- [ ] modelar tabela
- [ ] modelar calendário
- [ ] criar promoção
- [ ] criar rebaixamento
- [ ] criar geração automática de nova série quando lotar
- [ ] aplicar regra de 20 clubes por divisão

---

## 9. Backlog da Fase 7 - Seleções

- [ ] modelar seleção nacional
- [ ] modelar técnico da seleção
- [ ] criar convocação
- [ ] criar competições de seleção
- [ ] criar histórico internacional
- [ ] criar recordes internacionais

---

## 10. Backlog da Fase 8 - Expansão internacional

- [ ] ativar Argentina
- [ ] ativar Espanha
- [ ] ativar países europeus prioritários
- [ ] adaptar divisões por país
- [ ] adaptar copas por país
- [ ] adaptar acesso e rebaixamento por país

---

## 11. Backlog de qualidade e manutenção

- [ ] padronizar callbacks do Telegram
- [ ] padronizar erros de domínio
- [ ] padronizar responses de serviços
- [ ] criar logs estruturados
- [ ] criar auditoria de fluxos críticos
- [ ] revisar nomenclaturas
- [ ] revisar enumerações do domínio
- [ ] revisar documentação após cada fase

---

## 12. Backlog imediato recomendado

Este é o backlog mais importante agora:

1. [ ] modelagem inicial Prisma da Fase 1
2. [ ] serviço de criação de jogador
3. [ ] fluxo Telegram de criação do jogador
4. [ ] serviço de treino semanal
5. [ ] fluxo Telegram de treino
6. [ ] serviço de peneira
7. [ ] fluxo Telegram de peneira
8. [ ] vínculo com clube profissional inicial
9. [ ] leitura da ficha do jogador
10. [ ] persistência dos históricos básicos

---

## 13. Regra final do backlog

Nenhuma tarefa deve ser aberta em formato vago como:
- criar o jogo inteiro
- fazer tudo da fase
- construir o sistema completo

Toda tarefa deve ser:
- pequena
- verificável
- com começo, meio e fim