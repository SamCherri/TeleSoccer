
Markdown

# TeleSoccer - Arquitetura do Projeto

## 1. Objetivo deste documento

Este documento define a arquitetura recomendada para o TeleSoccer.

O foco é garantir:

- separação clara entre domínio do jogo e Telegram
- crescimento por fases
- persistência robusta
- manutenção simples
- compatibilidade com Railway, Prisma e PostgreSQL

---

## 2. Princípios arquiteturais

O projeto deve seguir estes princípios:

1. regra de negócio primeiro
2. domínio separado de infraestrutura
3. Telegram tratado como camada de entrada e saída
4. persistência desacoplada da lógica do jogo
5. serviços pequenos e específicos
6. crescimento incremental por fases
7. evitar acoplamento desnecessário
8. evitar dependências desnecessárias

---

## 3. Stack obrigatória

- **Node.js**
- **TypeScript**
- **Prisma**
- **PostgreSQL**
- **Railway**
- bot do **Telegram**

---

## 4. Estrutura de pastas esperada

```text
prisma/
src/
  app/
  assets/
  bot/
  config/
  domain/
  infra/
  shared/
docs/
5. Responsabilidade de cada camada
5.1 src/domain/
Camada principal do jogo.
Aqui ficam:
entidades
regras de negócio
serviços de domínio
contratos internos
enums do universo do jogo
validações de regra
Exemplos:
criação de jogador
cálculo de atributos iniciais
treino semanal
tentativa de peneira
contrato profissional
regras de suspensão
lógica de carreira
regras de renascimento
Regra
A camada de domínio não deve depender do Telegram.
5.2 src/infra/
Camada de infraestrutura.
Aqui ficam:
repositórios concretos
acesso ao banco
implementação Prisma
gateways externos
adapters
serviços técnicos
Exemplos:
PrismaPlayerRepository
PrismaClubRepository
PrismaTrainingRepository
5.3 src/bot/
Camada de integração com Telegram.
Aqui ficam:
comandos
handlers
menus
teclados inline
roteamento de interações
serialização de respostas para o chat
Regra
A camada do bot:
chama serviços do domínio
recebe respostas do domínio
transforma isso em mensagens, botões e fluxos do Telegram
Ela não deve conter regra de negócio pesada.
5.4 src/app/
Camada de composição da aplicação.
Aqui ficam:
bootstrap
inicialização
registro de dependências
composição de serviços
inicialização do bot
wiring do sistema
5.5 src/config/
Configurações da aplicação.
Aqui ficam:
leitura de variáveis de ambiente
configuração de banco
configuração do bot
parâmetros globais
Regra
Não usar .env nas instruções finais do projeto. As variáveis serão configuradas no Railway.
5.6 src/shared/
Utilitários compartilhados.
Aqui ficam:
tipos comuns
helpers neutros
erros padronizados
utilitários genéricos
ids, datas, formatadores
Regra
Não colocar regra de negócio do futebol aqui.
5.7 prisma/
Camada de banco.
Aqui ficam:
schema.prisma
migrations
seeds, se o projeto usar
enums persistidos
índices e relacionamentos
6. Organização recomendada dentro do domínio
Estrutura sugerida:
Plain text
src/domain/
  player/
    entities/
    services/
    repositories/
    types/
    enums/
  club/
    entities/
    services/
    repositories/
    types/
    enums/
  training/
    entities/
    services/
    repositories/
  tryout/
    entities/
    services/
    repositories/
  match/
    entities/
    services/
    repositories/
  contract/
    entities/
    services/
    repositories/
  coach/
    entities/
    services/
    repositories/
  competition/
    entities/
    services/
    repositories/
Não é obrigatório criar tudo agora. A regra é criar conforme a fase do roadmap.
7. Arquitetura por fluxo
7.1 Exemplo: criação de jogador
Fluxo esperado:
comando ou ação chega pelo bot
handler do bot chama o caso de uso
serviço de domínio valida regras
repositórios persistem no banco
serviço devolve resultado estruturado
bot transforma em mensagem para o usuário
Exemplo conceitual
CreatePlayerCommandHandler
CreatePlayerService
PlayerRepository
WalletRepository
CareerRepository
7.2 Exemplo: treino semanal
usuário abre menu de treino
bot carrega opções válidas
usuário escolhe fundamento
domínio valida:
se já treinou na semana
se tem dinheiro
se fundamento é válido
domínio aplica custo
domínio registra treino
domínio aplica progressão
bot retorna resultado
7.3 Exemplo: peneira
usuário entra em tentativa de peneira
sistema valida:
se tem dinheiro
se pode tentar
registra tentativa
calcula resultado
se aprovado:
vincula jogador ao profissional
registra início de carreira profissional
bot mostra o resultado
8. Entidades centrais do projeto
Estas são as entidades macro esperadas no universo do TeleSoccer.
8.1 Usuário
Representa a conta do jogador no sistema.
Responsabilidades:
identidade da conta
vínculo com papéis
permissões de Premium
controle de múltiplas contas quando houver
8.2 Jogador
Representa o personagem jogável do usuário.
Responsabilidades:
identidade esportiva
posição principal
pé dominante
idade
nacionalidade
altura
peso
visual
atributos
status da carreira
8.3 Geração do jogador
Representa a vida atual e vidas passadas.
Responsabilidades:
histórico de renascimentos
pontos herdados
controle de gerações
8.4 Clube
Representa um clube do jogo.
Responsabilidades:
identidade do clube
país
cidade
divisão
dono
técnico
orçamento
elenco
8.5 Técnico
Representa o papel de técnico.
Responsabilidades:
formação
estilo de jogo
escalação
substituições
treino coletivo
8.6 Contrato
Representa o vínculo entre jogador e clube.
Responsabilidades:
salário
duração
multa
bônus
cláusulas
8.7 Partida
Representa uma partida jogável.
Responsabilidades:
placar
tempo
turnos
eventos
lances
faltas
cartões
lesões
ações do jogador
8.8 Competição
Representa campeonatos, copas e ligas.
Responsabilidades:
formato
participantes
calendário
classificação
promoção
rebaixamento
9. Repositórios
Todo acesso a dados persistidos deve passar por interfaces de repositório.
Exemplos:
PlayerRepository
ClubRepository
WalletRepository
TrainingSessionRepository
TryoutAttemptRepository
ContractRepository
MatchRepository
Regra
Serviços de domínio devem depender de interfaces. Implementações concretas ficam em src/infra/.
10. Casos de uso / serviços de domínio
Cada fluxo importante deve virar um serviço ou caso de uso claro.
Exemplos:
CreatePlayerService
GetPlayerProfileService
RunWeeklyTrainingService
AttemptTryoutService
AcceptProfessionalEntryService
OfferContractService
AcceptContractService
RequestTransferService
Regra
Cada serviço deve ter:
entrada clara
saída clara
validações de regra
responsabilidade única sempre que possível
11. Bot Telegram como camada de aplicação
O Telegram deve ser tratado como interface, não como centro do projeto.
O bot deve fazer
receber comandos
receber clique de botão
montar resposta textual
montar teclado inline
controlar navegação
O bot não deve fazer
calcular atributo
decidir contrato
aplicar treino
calcular resultado de peneira
decidir promoção/rebaixamento
guardar regra central de futebol
Tudo isso pertence ao domínio.
12. Banco de dados
O banco deve ser pensado para crescimento por fases.
Diretrizes
usar ids estáveis
usar relacionamentos explícitos
evitar colunas genéricas demais
prever histórico
prever múltiplas gerações do jogador
prever evolução futura para técnico e dono
Requisitos importantes
histórico de carreira
histórico de treino
histórico de peneira
vínculo com clubes
histórico contratual
histórico disciplinar
histórico de lesões
recordes
13. Expansão por fases
A arquitetura precisa suportar este crescimento:
Fase 1
jogador
treino
peneira
entrada no profissional
Fase 2
partidas por turnos
Fase 3
contratos e mercado
Fase 4
técnico e tática
Fase 5
dono de clube
Fase 6
ligas e temporadas
Fase 7
seleções
Fase 8
expansão internacional
14. Regras de implementação
Antes de criar qualquer feature, sempre responder internamente:
qual é a regra de negócio?
qual entidade é responsável?
qual serviço aplica a regra?
o que precisa persistir?
o que o bot precisa mostrar?
como isso será expandido depois?
15. Diretriz final
A arquitetura do TeleSoccer deve sempre privilegiar:
domínio forte
persistência segura
integração limpa com Telegram
expansão por fases
manutenção simples
escalabilidade real