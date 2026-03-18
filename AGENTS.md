# AGENTS.md

## TeleSoccer - Instruções do Repositório para Codex e GPT

Você está trabalhando no projeto **TeleSoccer**, um jogo de futebol via bot do Telegram.

Leia este arquivo antes de modificar qualquer coisa no projeto.

---

## 1. Objetivo do projeto

O TeleSoccer é um universo de futebol jogável via bot do Telegram.

O projeto começa com a carreira de um jogador controlado por usuário e evolui, por fases, para um ecossistema mais amplo envolvendo:

- jogador
- técnico
- dono de clube
- clubes
- ligas
- copas
- seleções
- temporadas
- mercado de transferências
- progressão por gerações de personagem

O projeto deve crescer por fases, sem quebrar a base já estabilizada.

---

## 2. Prioridade arquitetural

Sempre priorizar nesta ordem:

1. regra de negócio
2. modelagem de dados
3. serviços de domínio
4. persistência
5. integração com bot Telegram
6. apresentação e interface compatível

Nunca começar pela parte visual sem que a base de domínio esteja definida.

---

## 3. Stack obrigatória

Respeitar obrigatoriamente:

- **Prisma** como modelagem de banco
- **PostgreSQL** como banco principal
- **Railway** como ambiente principal de deploy
- arquitetura modular existente do projeto

Nunca assumir:

- Termux
- execução local Android como ambiente principal
- soluções fora do Railway como padrão do projeto

Nunca usar `.env` nas instruções finais de deploy. As variáveis serão configuradas diretamente no Railway.

---

## 4. Estrutura que deve ser preservada

Preservar a coerência com esta estrutura:

- `prisma/`
- `src/app/`
- `src/assets/`
- `src/bot/`
- `src/config/`
- `src/domain/`
- `src/infra/`
- `src/shared/`
- `docs/`

Não propor reorganização grande sem necessidade real.

---

## 5. Regras de atuação

1. Nunca remover funcionalidades existentes sem avisar claramente.
2. Nunca alterar fluxos principais sem explicar impacto.
3. Nunca propor refatoração grande sem necessidade real.
4. Sempre priorizar continuidade sobre reinvenção.
5. Sempre trabalhar em cima da estrutura já existente.
6. Sempre considerar escalabilidade para futuras fases do jogo.
7. Sempre manter coerência com o universo futebolístico do projeto.
8. Sempre pensar primeiro em backend, fluxo, banco e integração.
9. Sempre evitar acoplamento forte entre domínio do jogo e camada Telegram.
10. Sempre manter regras de negócio separadas de infraestrutura.

---

## 6. O que sempre definir antes de codar uma feature

Antes de implementar qualquer feature, definir:

- objetivo
- regra de negócio
- fluxo do usuário
- impacto no banco
- impacto no bot Telegram
- impacto visual
- critérios de aceite

Se algo disso estiver ausente, inferir com base em `docs/current-phase.md`, `docs/roadmap.md` e `docs/game-rules.md`.

---

## 7. Forma correta de trabalhar neste repositório

Sempre trabalhar com tarefas pequenas, verificáveis e fechadas.

Exemplos de tarefas corretas:

- criar modelagem inicial de Player e PlayerCareer
- implementar fluxo de criação de jogador
- implementar serviço de treino individual semanal
- implementar tentativa de peneira
- implementar leitura do contexto de lance no bot
- implementar contrato profissional básico

Exemplos de tarefas erradas:

- criar o jogo inteiro
- refazer toda a arquitetura
- inventar telas soltas sem base
- misturar mercado, partida, clube e seleção no mesmo passo sem necessidade

---

## 8. Universo funcional do jogo

O projeto deve respeitar a visão definida pelo usuário.

### Base inicial do jogo
- cada usuário começa como jogador
- o jogador cria um personagem
- começa com 14 anos
- joga até 40 anos
- pode seguir no futebol até 65 anos em funções futuras
- após aposentadoria, renasce aos 14 anos
- herda 1% da vida anterior em pontos livres para distribuir

### Partidas
- online por turnos
- decisões por botões simples no Telegram
- o usuário controla somente o próprio personagem
- cada turno tem 30 segundos
- se o usuário não responder, perde o lance
- o adversário fica com a posse
- ações disponíveis dependem do contexto do lance

### Evolução
- sem nível geral
- sem barra de XP
- evolução por ações executadas
- treino individual semanal
- treino coletivo decidido pelo técnico
- sem queda de atributos por desuso

### Futebol
Seguir a lógica do futebol real, salvo simplificações já aprovadas pelo projeto.

Exemplos já aceitos:
- sem impedimento por enquanto
- há faltas, pênaltis, escanteios, laterais, substituições e cartões
- há lesões
- há energia física
- há histórico de carreira
- há recordes

### Clubes
- donos de clube criam clubes do zero
- o clube entra na divisão mais baixa disponível do país
- quando a divisão lota, abre-se nova série abaixo
- cada série tem 20 clubes
- o clube novo começa com base mínima gerada pelo sistema

### Papéis futuros
- técnico
- dono de clube
- técnico de seleção
- expansão para países e competições internacionais

---

## 9. Regras de entrega de código

Quando responder com implementação:

- informar exatamente quais arquivos serão criados ou alterados
- enviar o caminho do arquivo fora do bloco
- enviar o conteúdo completo de cada arquivo
- nunca enviar apenas trechos soltos quando a alteração exigir contexto completo
- não omitir imports, tipos, interfaces, schemas ou exports necessários
- não deixar partes críticas “para completar depois”
- quando houver mudança de banco, incluir schema, migration e impacto esperado

---

## 10. Formato obrigatório de entrega

Sempre numerar os arquivos:

1. caminho do arquivo
2. conteúdo completo do arquivo

Se houver comandos necessários, colocar depois dos arquivos, separados.

Não misturar caminho e conteúdo no mesmo bloco.

---

## 11. Restrições importantes

Não fazer:

- soluções genéricas desconectadas do TeleSoccer
- mudanças de stack sem necessidade real
- dependências desnecessárias
- lógica crítica escondida em camada errada
- mudanças grandes sem justificativa
- respostas vagas do tipo “depois você completa”

---

## 12. Critério de qualidade

As decisões devem priorizar:

- clareza
- robustez
- escalabilidade
- compatibilidade com a base atual
- facilidade de manutenção
- coerência com o roadmap do jogo

---

## 13. Documentos de referência obrigatórios

Antes de trabalhar, consultar:

- `docs/game-rules.md`
- `docs/roadmap.md`
- `docs/current-phase.md`

Se houver conflito, a prioridade é:

1. `docs/current-phase.md`
2. `docs/game-rules.md`
3. `docs/roadmap.md`
4. este `AGENTS.md`

---

## 14. Conduta esperada

Aja como mantenedor técnico do TeleSoccer.

Seu papel não é reinventar o projeto.
Seu papel é expandir o jogo com segurança, consistência arquitetural e foco em entrega real.