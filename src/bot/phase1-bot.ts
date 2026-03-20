import { AttributeKey, CareerStatus, PlayerPosition, TryoutStatus, WalletTransactionType } from '../domain/shared/enums';
import {
  CreatePlayerService,
  GetCareerHistoryService,
  GetCareerStatusService,
  GetPlayerCardService,
  GetWalletStatementService,
  TryoutService,
  WeeklyTrainingService,
  phase1Economy
} from '../domain/player/services';
import { CreatePlayerInput } from '../domain/player/types';
import { DomainError } from '../shared/errors';
import { GetActiveMatchService, ResolveMatchTurnService, StartMatchService } from '../domain/match/services';
import { MatchActionKey, MatchStatus } from '../domain/match/types';
import {
  CreateMultiplayerSessionService,
  GetMultiplayerSessionService,
  JoinMultiplayerSessionService,
  PrepareMultiplayerSessionService
} from '../domain/multiplayer/services';
import {
  MultiplayerSessionFillPolicy,
  MultiplayerSquadRole,
  MultiplayerTeamSide
} from '../domain/multiplayer/types';
import { GameCardRenderer } from '../presentation/game-card-renderer';

export interface BotReply {
  text: string;
  actions: string[];
}

export const phase1BotActions = {
  createPlayer: 'Criar jogador',
  mainMenu: 'Continuar jornada',
  playerCard: 'Minha carreira',
  weeklyTraining: 'Ir ao centro de treinamento',
  tryout: 'Buscar peneira regional',
  confirmTryout: 'Entrar na peneira',
  careerStatus: 'Meu momento',
  careerHistory: 'Linha da carreira',
  walletStatement: 'Minha carteira',
  startMatch: 'Entrar no estádio',
  currentMatch: 'Voltar ao jogo atual',
  resolveTimeout: 'Deixar o lance seguir',
  weekAgenda: 'Ver agenda da semana',
  lockerRoom: 'Entrar no vestiário',
  invitations: 'Convites e oportunidades',
  createSession: 'Abrir convocação do confronto',
  currentSession: 'Ver meu elenco',
  prepareSession: 'Levar elenco ao aquecimento',
  joinSessionGuide: '/entrar-sala CODIGO HOME TITULAR',
  trainingPassing: 'Treinar passe',
  trainingShooting: 'Treinar finalização',
  trainingDribbling: 'Treinar drible',
  trainingSpeed: 'Treinar velocidade',
  trainingMarking: 'Treinar marcação',
  trainingReflexes: 'Treinar reflexos',
  cancel: 'Cancelar',
  confirmCreatePlayer: 'Confirmar criação',
  restartCreation: 'Refazer criação',
  positionGoalkeeper: 'Goleiro',
  positionDefender: 'Defensor',
  positionMidfielder: 'Meio-campo',
  positionForward: 'Atacante',
  footRight: 'Direito',
  footLeft: 'Esquerdo',
  skinToneFair: 'Clara',
  skinToneTan: 'Morena',
  skinToneBrown: 'Parda',
  skinToneDark: 'Negra',
  hairStyleShort: 'Curto',
  hairStyleCurly: 'Cacheado',
  hairStyleWavy: 'Ondulado',
  hairStyleShaved: 'Raspado',
  matchPass: 'Passar na partida',
  matchDribble: 'Driblar na partida',
  matchShoot: 'Finalizar na partida',
  matchControl: 'Dominar na partida',
  matchProtect: 'Proteger bola na partida',
  matchTackle: 'Dar bote na partida',
  matchClear: 'Afastar na partida',
  matchSave: 'Defender na partida',
  matchPunch: 'Espalmar na partida',
  matchCatch: 'Segurar na partida',
  matchRushOut: 'Sair do gol na partida',
  matchRebound: 'Rebater na partida',
  matchHand: 'Reposição com a mão',
  matchFoot: 'Reposição com o pé',
  matchLowLeft: 'Cobrar baixo esquerdo',
  matchLowRight: 'Cobrar baixo direito',
  matchHighLeft: 'Cobrar alto esquerdo',
  matchHighRight: 'Cobrar alto direito'
} as const;

const walletTransactionLabels: Record<WalletTransactionType, string> = {
  [WalletTransactionType.InitialGrant]: 'Crédito inicial',
  [WalletTransactionType.TrainingCost]: 'Custo de treino',
  [WalletTransactionType.TryoutCost]: 'Taxa de peneira'
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const matchActionLabels: Record<MatchActionKey, string> = {
  [MatchActionKey.Pass]: phase1BotActions.matchPass,
  [MatchActionKey.Dribble]: phase1BotActions.matchDribble,
  [MatchActionKey.Shoot]: phase1BotActions.matchShoot,
  [MatchActionKey.Control]: phase1BotActions.matchControl,
  [MatchActionKey.Protect]: phase1BotActions.matchProtect,
  [MatchActionKey.Tackle]: phase1BotActions.matchTackle,
  [MatchActionKey.Clear]: phase1BotActions.matchClear,
  [MatchActionKey.Save]: phase1BotActions.matchSave,
  [MatchActionKey.Punch]: phase1BotActions.matchPunch,
  [MatchActionKey.Catch]: phase1BotActions.matchCatch,
  [MatchActionKey.RushOut]: phase1BotActions.matchRushOut,
  [MatchActionKey.Rebound]: phase1BotActions.matchRebound,
  [MatchActionKey.DistributeHand]: phase1BotActions.matchHand,
  [MatchActionKey.DistributeFoot]: phase1BotActions.matchFoot,
  [MatchActionKey.AimLowLeft]: phase1BotActions.matchLowLeft,
  [MatchActionKey.AimLowRight]: phase1BotActions.matchLowRight,
  [MatchActionKey.AimHighLeft]: phase1BotActions.matchHighLeft,
  [MatchActionKey.AimHighRight]: phase1BotActions.matchHighRight
};

const sideExample = 'HOME ou AWAY';
const roleExample = 'TITULAR ou RESERVA';

export class Phase1TelegramFacade {
  private readonly startMatchService: StartMatchService;
  private readonly getActiveMatchService: GetActiveMatchService;
  private readonly resolveMatchTurnService: ResolveMatchTurnService;
  private readonly createMultiplayerSessionService: CreateMultiplayerSessionService;
  private readonly getMultiplayerSessionService: GetMultiplayerSessionService;
  private readonly joinMultiplayerSessionService: JoinMultiplayerSessionService;
  private readonly prepareMultiplayerSessionService: PrepareMultiplayerSessionService;
  private readonly renderer: GameCardRenderer;

  constructor(
    private readonly createPlayerService: CreatePlayerService,
    private readonly getPlayerCardService: GetPlayerCardService,
    private readonly getCareerStatusService: GetCareerStatusService,
    private readonly getCareerHistoryService: GetCareerHistoryService,
    private readonly getWalletStatementService: GetWalletStatementService,
    private readonly weeklyTrainingService: WeeklyTrainingService,
    private readonly tryoutService: TryoutService,
    startMatchService?: StartMatchService,
    getActiveMatchService?: GetActiveMatchService,
    resolveMatchTurnService?: ResolveMatchTurnService,
    createMultiplayerSessionService?: CreateMultiplayerSessionService,
    getMultiplayerSessionService?: GetMultiplayerSessionService,
    joinMultiplayerSessionService?: JoinMultiplayerSessionService,
    prepareMultiplayerSessionService?: PrepareMultiplayerSessionService,
    renderer?: GameCardRenderer
  ) {
    this.startMatchService =
      startMatchService ??
      ({ execute: async () => { throw new DomainError('Partidas da Fase 2 não configuradas neste ambiente de teste.'); } } as unknown as StartMatchService);
    this.getActiveMatchService =
      getActiveMatchService ??
      ({
        execute: async () => { throw new DomainError('Partidas da Fase 2 não configuradas neste ambiente de teste.'); },
        executeOptional: async () => null
      } as unknown as GetActiveMatchService);
    this.resolveMatchTurnService =
      resolveMatchTurnService ??
      ({ execute: async () => { throw new DomainError('Partidas da Fase 2 não configuradas neste ambiente de teste.'); } } as unknown as ResolveMatchTurnService);
    this.createMultiplayerSessionService =
      createMultiplayerSessionService ??
      ({ execute: async () => { throw new DomainError('Multiplayer ainda não configurado neste ambiente de teste.'); } } as unknown as CreateMultiplayerSessionService);
    this.getMultiplayerSessionService =
      getMultiplayerSessionService ??
      ({ execute: async () => { throw new DomainError('Multiplayer ainda não configurado neste ambiente de teste.'); } } as unknown as GetMultiplayerSessionService);
    this.joinMultiplayerSessionService =
      joinMultiplayerSessionService ??
      ({ execute: async () => { throw new DomainError('Multiplayer ainda não configurado neste ambiente de teste.'); } } as unknown as JoinMultiplayerSessionService);
    this.prepareMultiplayerSessionService =
      prepareMultiplayerSessionService ??
      ({ execute: async () => { throw new DomainError('Multiplayer ainda não configurado neste ambiente de teste.'); } } as unknown as PrepareMultiplayerSessionService);
    this.renderer = renderer ?? new GameCardRenderer();
  }

  async handleEntry(telegramId: string): Promise<BotReply> {
    try {
      return await this.handleWorldHub(telegramId);
    } catch (error) {
      if (error instanceof DomainError) {
        return this.handleCreatePlayerPrompt();
      }

      throw error;
    }
  }

  handleCreatePlayerPrompt(): BotReply {
    return {
      text: [
        'Bem-vindo ao TeleSoccer.',
        'Você ainda não criou seu jogador da Fase 1.',
        'Use o fluxo conversacional do bot para informar os dados e confirmar sua carreira.'
      ].join('\n'),
      actions: [phase1BotActions.createPlayer]
    };
  }

  async handleCreatePlayer(input: CreatePlayerInput): Promise<BotReply> {
    const player = await this.createPlayerService.execute(input);
    return {
      text: `Jogador ${player.name} criado com sucesso. Saldo inicial: ${player.walletBalance} moedas.`,
      actions: this.buildWorldActions({ isProfessional: player.careerStatus === CareerStatus.Professional })
    };
  }

  async handleMainMenu(telegramId: string): Promise<BotReply> {
    return this.handleWorldHub(telegramId);
  }

  async handlePlayerCard(telegramId: string): Promise<BotReply> {
    const player = await this.getPlayerCardService.execute(telegramId);
    return {
      text: [
        `Ficha de ${player.name}`,
        `Idade: ${player.age}`,
        `Posição: ${player.position}`,
        `Pé dominante: ${player.dominantFoot}`,
        `Clube atual: ${player.currentClubName ?? 'Base amadora'}`,
        `Saldo: ${player.walletBalance}`,
        `Atributos: ${Object.entries(player.attributes)
          .map(([key, value]) => `${key} ${value}`)
          .join(', ')}`
      ].join('\n'),
      actions: [...this.buildWorldActions({ isProfessional: player.careerStatus === CareerStatus.Professional })]
    };
  }

  async handleCareerStatus(telegramId: string): Promise<BotReply> {
    const status = await this.getCareerStatusService.execute(telegramId);
    const latestTryoutLine = status.latestTryout
      ? status.latestTryout.status === TryoutStatus.Approved
        ? `Última peneira: aprovada (${status.latestTryout.score}/${status.latestTryout.requiredScore}) no clube ${status.latestTryout.clubName}.`
        : `Última peneira: reprovada (${status.latestTryout.score}/${status.latestTryout.requiredScore}).`
      : 'Última peneira: nenhuma tentativa registrada.';

    return {
      text: [
        `Status da carreira de ${status.playerName}`,
        `Fase atual: ${status.careerStatus}`,
        `Clube atual: ${status.currentClubName ?? 'Base amadora'}`,
        `Saldo: ${status.walletBalance}`,
        `Semana do jogo: ${status.currentWeekNumber}`,
        `Treino da semana: ${status.trainingAvailableThisWeek ? 'disponível' : 'já utilizado'}`,
        `Total de treinos: ${status.totalTrainings}`,
        `Total de peneiras: ${status.totalTryouts}`,
        latestTryoutLine,
        `Histórico recente: ${status.recentHistory.length > 0 ? status.recentHistory.map((entry) => entry.description).join(' | ') : 'sem eventos ainda.'}`
      ].join('\n'),
      actions: this.buildWorldActions({ isProfessional: status.careerStatus === CareerStatus.Professional })
    };
  }

  async handleCareerHistory(telegramId: string): Promise<BotReply> {
    const history = await this.getCareerHistoryService.execute(telegramId);

    return {
      text: [
        `Histórico da carreira de ${history.playerName}`,
        `Status atual: ${history.careerStatus}`,
        `Clube atual: ${history.currentClubName ?? 'Base amadora'}`,
        `Eventos exibidos: ${history.entries.length}/${history.totalEntries}`,
        history.entries.length > 0
          ? history.entries.map((entry) => `- ${formatDate(entry.createdAt)} | ${entry.description}`).join('\n')
          : 'Nenhum evento registrado ainda.'
      ].join('\n'),
      actions: this.buildWorldActions({ isProfessional: history.careerStatus === CareerStatus.Professional })
    };
  }

  async handleWalletStatement(telegramId: string): Promise<BotReply> {
    const statement = await this.getWalletStatementService.execute(telegramId);

    return {
      text: [
        `Extrato da carteira de ${statement.playerName}`,
        `Saldo atual: ${statement.walletBalance} moedas`,
        `Transações exibidas: ${statement.transactionCount}`,
        statement.recentTransactions.length > 0
          ? statement.recentTransactions
              .map(
                (transaction) =>
                  `${walletTransactionLabels[transaction.type]}: ${transaction.amount > 0 ? '+' : ''}${transaction.amount} | ${transaction.description}`
              )
              .join('\n')
          : 'Nenhuma transação registrada ainda.'
      ].join('\n'),
      actions: this.buildWorldActions({ isProfessional: statement.careerStatus === CareerStatus.Professional })
    };
  }

  async handleTrainingMenu(telegramId: string): Promise<BotReply> {
    const player = await this.getPlayerCardService.execute(telegramId);
    return {
      text: [
        `Treino semanal de ${player.name}`,
        `Cada treino custa ${phase1Economy.trainingCost} moedas e melhora apenas 1 fundamento.`,
        `Saldo atual: ${player.walletBalance} moedas`,
        'Escolha o fundamento para esta semana.'
      ].join('\n'),
      actions: this.buildTrainingActions(player.position === PlayerPosition.Goalkeeper)
    };
  }

  async handleTryoutPrompt(telegramId: string): Promise<BotReply> {
    const player = await this.getPlayerCardService.execute(telegramId);
    return {
      text: [
        `Peneira regional de ${player.name}`,
        `Esta tentativa custa ${phase1Economy.tryoutCost} moedas.`,
        `Saldo atual: ${player.walletBalance} moedas`,
        'Confirme para participar da peneira.'
      ].join('\n'),
      actions: [phase1BotActions.confirmTryout, phase1BotActions.mainMenu, phase1BotActions.cancel]
    };
  }

  async handleWeeklyTraining(telegramId: string, focus: AttributeKey): Promise<BotReply> {
    const result = await this.weeklyTrainingService.execute(telegramId, focus);
    const player = await this.getPlayerCardService.execute(telegramId);
    return {
      text: `Treino concluído em ${focus}. Novo valor: ${result.newValue}. Saldo restante: ${result.walletBalance}.`,
      actions: this.buildWorldActions({ isProfessional: player.careerStatus === CareerStatus.Professional })
    };
  }

  async handleTryout(telegramId: string): Promise<BotReply> {
    const result = await this.tryoutService.execute(telegramId);
    return {
      text:
        result.status === TryoutStatus.Approved
          ? `Parabéns. Você foi aprovado na peneira e entrou no profissional pelo clube ${result.clubName}.`
          : `Você não foi aprovado na peneira. Pontuação ${result.score}/${result.requiredScore}.`,
      actions: this.buildWorldActions({ isProfessional: result.status === TryoutStatus.Approved })
    };
  }

  async handleStartMatch(telegramId: string): Promise<BotReply> {
    const result = await this.startMatchService.execute(telegramId);
    const snapshot = await this.getWorldSnapshot(telegramId);
    return this.toMatchReply(result.match, 'Partida iniciada com sucesso.', this.buildWorldActionsFromSnapshot(snapshot));
  }

  async handleCurrentMatch(telegramId: string): Promise<BotReply> {
    const match = await this.getActiveMatchService.execute(telegramId);
    const snapshot = await this.getWorldSnapshot(telegramId);
    return this.toMatchReply(
      match,
      match.status === MatchStatus.Finished ? 'Última partida encerrada.' : 'Status atual da partida.',
      this.buildWorldActionsFromSnapshot(snapshot)
    );
  }

  async handleMatchAction(telegramId: string, action?: MatchActionKey): Promise<BotReply> {
    const result = await this.resolveMatchTurnService.execute(telegramId, action);
    const snapshot = await this.getWorldSnapshot(telegramId);
    return this.toMatchReply(result.match, result.resolutionText, this.buildWorldActionsFromSnapshot(snapshot));
  }

  async handleWorldHub(telegramId: string): Promise<BotReply> {
    const snapshot = await this.getWorldSnapshot(telegramId);

    return {
      text: [
        this.renderer.renderOnlineWorldCard({
          playerName: snapshot.player.name,
          age: snapshot.player.age,
          position: snapshot.player.position,
          careerStatus: snapshot.player.careerStatus,
          currentClubName: snapshot.player.currentClubName ?? undefined,
          walletBalance: snapshot.player.walletBalance,
          currentWeekNumber: snapshot.status.currentWeekNumber,
          trainingAvailableThisWeek: snapshot.status.trainingAvailableThisWeek,
          activeMatch: snapshot.activeMatch,
          currentSession: snapshot.currentSession,
          canTryout: snapshot.player.careerStatus !== CareerStatus.Professional
        }),
        'Você está dentro de um mundo contínuo de futebol: sua rotina, seus compromissos, seu elenco e seu jogo atual se encontram aqui.',
        snapshot.activeMatch
          ? 'Seu próximo passo mais urgente está no estádio.'
          : snapshot.currentSession
            ? 'Seu próximo passo social está no vestiário do confronto compartilhado.'
            : snapshot.player.careerStatus === CareerStatus.Professional
              ? 'Seu próximo passo pode ser abrir uma convocação, entrar no vestiário ou seguir sua rotina da semana.'
              : 'Seu próximo passo é fortalecer sua rotina e buscar uma chance real na peneira regional.'
      ].join('\n\n'),
      actions: this.buildWorldActions({
        isProfessional: snapshot.player.careerStatus === CareerStatus.Professional,
        hasActiveMatch: Boolean(snapshot.activeMatch),
        hasCurrentSession: Boolean(snapshot.currentSession)
      })
    };
  }

  async handleMultiplayerHub(telegramId: string): Promise<BotReply> {
    // Compatibilidade interna para chamadas antigas de testes/integrações.
    return this.handleWorldHub(telegramId);
  }

  async handleWeekAgenda(telegramId: string): Promise<BotReply> {
    const snapshot = await this.getWorldSnapshot(telegramId);

    return {
      text: [
        this.renderer.renderWeeklyAgendaCard({
          playerName: snapshot.player.name,
          currentWeekNumber: snapshot.status.currentWeekNumber,
          trainingAvailableThisWeek: snapshot.status.trainingAvailableThisWeek,
          careerStatus: snapshot.player.careerStatus,
          hasActiveMatch: Boolean(snapshot.activeMatch),
          hasCurrentSession: Boolean(snapshot.currentSession),
          canTryout: snapshot.player.careerStatus !== CareerStatus.Professional
        }),
        snapshot.currentSession
          ? 'Seu elenco compartilhado já existe, então a agenda da semana também passa pelo vestiário.'
          : 'Sem convocação ativa, a semana fica livre para evolução pessoal e novas oportunidades.'
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  async handleLockerRoom(telegramId: string): Promise<BotReply> {
    const snapshot = await this.getWorldSnapshot(telegramId);

    if (!snapshot.currentSession) {
      return {
        text: [
          '🚪 VESTIÁRIO',
          'Seu vestiário compartilhado ainda está vazio.',
          snapshot.player.careerStatus === CareerStatus.Professional
            ? 'Quando você abrir uma convocação ou entrar em uma chamada existente, o elenco aparecerá aqui com titulares, reservas e aquecimento.'
            : 'Primeiro consolide sua carreira nas peneiras regionais para passar a frequentar o ambiente profissional.'
        ].join('\n\n'),
        actions: this.buildWorldActionsFromSnapshot(snapshot)
      };
    }

    return {
      text: [
        '🚪 VESTIÁRIO DO CONFRONTO',
        this.renderer.renderMultiplayerSessionCard(snapshot.currentSession),
        this.renderer.renderMultiplayerSquadCard(snapshot.currentSession, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(snapshot.currentSession, MultiplayerTeamSide.Away),
        this.renderer.renderMultiplayerPreparationCard(snapshot.currentSession)
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  async handleInvitations(telegramId: string): Promise<BotReply> {
    const snapshot = await this.getWorldSnapshot(telegramId);

    const invitationLines = snapshot.player.careerStatus !== CareerStatus.Professional
      ? [
          'Seu mundo social ainda começa pela primeira oportunidade profissional.',
          'Aqui, suas oportunidades ainda são de entrada: peneira regional, rotina e progresso rumo ao ambiente profissional.',
          'Ainda não existe convocação de elenco profissional vinculada ao seu momento atual.'
        ]
      : snapshot.currentSession
        ? [
            `Você já respondeu a uma convocação compartilhada na sala ${snapshot.currentSession.code}.`,
            'Seu próximo passo social é alinhar o elenco no vestiário e levar o grupo ao aquecimento.'
          ]
        : [
            'Nenhuma convocação foi assumida por você neste instante.',
            'Você pode abrir uma convocação do confronto e trazer outros profissionais para o mesmo elenco.'
          ];

    return {
      text: [
        '📨 CONVITES E OPORTUNIDADES',
        ...invitationLines,
        snapshot.activeMatch ? 'Além disso, existe um jogo vivo em andamento pedindo sua atenção imediata no estádio.' : 'Sem jogo ao vivo bloqueando novas oportunidades agora.'
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  async handleCreateSession(telegramId: string): Promise<BotReply> {
    const result = await this.createMultiplayerSessionService.execute(telegramId, {
      preferredSide: MultiplayerTeamSide.Home,
      preferredRole: MultiplayerSquadRole.Starter,
      fillPolicy: MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback,
      maxStartersPerSide: 3,
      maxSubstitutesPerSide: 2,
      botFallbackEligibleSlots: 2,
      minimumHumansToStart: 2
    });
    const snapshot = await this.getWorldSnapshot(telegramId);

    return {
      text: [
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away),
        'A convocação do confronto foi aberta dentro do mesmo mundo da sua carreira.',
        `Código da convocação: ${result.session.code}. Compartilhe esse código com outros profissionais para formar o confronto.`
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  async handleCurrentSession(telegramId: string, sessionCode?: string): Promise<BotReply> {
    const session = await this.getMultiplayerSessionService.execute(telegramId, sessionCode);
    const snapshot = await this.getWorldSnapshot(telegramId);
    const isOwnCurrentSession = !sessionCode || snapshot.currentSession?.code === session.code;
    return {
      text: [
        this.renderer.renderMultiplayerSessionCard(session),
        this.renderer.renderMultiplayerSquadCard(session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(session, MultiplayerTeamSide.Away),
        this.renderer.renderMultiplayerPreparationCard(session),
        isOwnCurrentSession
          ? 'Este ambiente faz parte da sua jornada atual no mundo do jogador.'
          : 'Você está apenas observando uma convocação externa pelo código, sem vínculo direto dela com a sua rotina atual.'
      ].join('\n\n'),
      actions: isOwnCurrentSession ? this.buildWorldActionsFromSnapshot(snapshot) : this.buildExternalSessionActions(snapshot)
    };
  }

  async handleJoinSession(
    telegramId: string,
    sessionCode: string,
    preferredSide?: MultiplayerTeamSide,
    preferredRole?: MultiplayerSquadRole
  ): Promise<BotReply> {
    const result = await this.joinMultiplayerSessionService.execute(telegramId, sessionCode, { preferredSide, preferredRole });
    const snapshot = await this.getWorldSnapshot(telegramId);
    return {
      text: [
        `✅ Convocação aceita na sala ${result.session.code}.`,
        `Seu lugar no elenco ficou em ${result.participant.side} | ${result.participant.squadRole} | vaga ${result.participant.slotNumber}.`,
        'Você segue no mesmo mundo da carreira; humanos continuam sendo prioridade e o apoio automático só entra depois, se o host levar o grupo adiante e houver vaga elegível.',
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away)
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  async handlePrepareSession(telegramId: string, sessionCode?: string): Promise<BotReply> {
    const result = await this.prepareMultiplayerSessionService.execute(telegramId, sessionCode);
    const snapshot = await this.getWorldSnapshot(telegramId);
    const botSummary = result.botsAdded.length > 0
      ? `O aquecimento ganhou ${result.botsAdded.length} apoio(s) automático(s) novo(s) nas vagas elegíveis.`
      : 'Nenhum apoio automático novo foi necessário neste aquecimento; a convocação permaneceu com prioridade humana.';
    return {
      text: [
        botSummary,
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerPreparationCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away)
      ].join('\n\n'),
      actions: this.buildWorldActionsFromSnapshot(snapshot)
    };
  }

  buildWorldActions(options: {
    isProfessional: boolean;
    hasActiveMatch?: boolean;
    hasCurrentSession?: boolean;
  }): string[] {
    const hasActiveMatch = options.hasActiveMatch ?? false;
    const hasCurrentSession = options.hasCurrentSession ?? false;

    return [
      phase1BotActions.mainMenu,
      phase1BotActions.careerStatus,
      phase1BotActions.weekAgenda,
      phase1BotActions.weeklyTraining,
      options.isProfessional
        ? (hasActiveMatch ? phase1BotActions.currentMatch : phase1BotActions.startMatch)
        : phase1BotActions.tryout,
      options.isProfessional
        ? (hasCurrentSession ? phase1BotActions.currentSession : phase1BotActions.createSession)
        : phase1BotActions.invitations,
      ...(options.isProfessional ? [phase1BotActions.lockerRoom, phase1BotActions.invitations] : [phase1BotActions.playerCard, phase1BotActions.careerHistory]),
      ...this.buildPersonalAreaActions(options.isProfessional)
    ];
  }

  private buildTrainingActions(isGoalkeeper: boolean): string[] {
    if (isGoalkeeper) {
      return [phase1BotActions.trainingReflexes, phase1BotActions.trainingPassing, phase1BotActions.cancel, phase1BotActions.mainMenu];
    }

    return [
      phase1BotActions.trainingPassing,
      phase1BotActions.trainingShooting,
      phase1BotActions.trainingDribbling,
      phase1BotActions.trainingSpeed,
      phase1BotActions.trainingMarking,
      phase1BotActions.cancel,
      phase1BotActions.mainMenu
    ];
  }

  private buildPersonalAreaActions(isProfessional: boolean): string[] {
    if (isProfessional) {
      return [
        phase1BotActions.playerCard,
        phase1BotActions.careerHistory,
        phase1BotActions.walletStatement
      ];
    }

    return [phase1BotActions.walletStatement];
  }

  private buildWorldActionsFromSnapshot(snapshot: {
    player: { careerStatus: CareerStatus };
    activeMatch: Awaited<ReturnType<GetActiveMatchService['executeOptional']>> | null;
    currentSession: Awaited<ReturnType<GetMultiplayerSessionService['getOptionalCurrentSession']>> | null;
  }): string[] {
    return this.buildWorldActions({
      isProfessional: snapshot.player.careerStatus === CareerStatus.Professional,
      hasActiveMatch: Boolean(snapshot.activeMatch),
      hasCurrentSession: Boolean(snapshot.currentSession)
    });
  }

  private buildExternalSessionActions(snapshot: {
    player: { careerStatus: CareerStatus };
    activeMatch: Awaited<ReturnType<GetActiveMatchService['executeOptional']>> | null;
    currentSession: Awaited<ReturnType<GetMultiplayerSessionService['getOptionalCurrentSession']>> | null;
  }): string[] {
    if (snapshot.player.careerStatus !== CareerStatus.Professional) {
      return this.buildWorldActionsFromSnapshot(snapshot);
    }

    return [
      phase1BotActions.mainMenu,
      phase1BotActions.weekAgenda,
      snapshot.currentSession ? phase1BotActions.currentSession : phase1BotActions.createSession,
      phase1BotActions.invitations,
      ...this.buildPersonalAreaActions(true)
    ];
  }

  private toMatchReply(
    match: Awaited<ReturnType<GetActiveMatchService['execute']>>,
    leadText: string,
    worldActions: string[]
  ): BotReply {
    const turn = match.activeTurn;

    return {
      text: [leadText, this.renderer.renderMatchCard(match)].join('\n\n'),
      actions:
        match.status === MatchStatus.Finished || !turn
          ? worldActions
          : [
              ...turn.availableActions.map((action) => matchActionLabels[action.key]),
              phase1BotActions.resolveTimeout,
              phase1BotActions.currentMatch,
              phase1BotActions.lockerRoom,
              phase1BotActions.mainMenu
            ]
    };
  }

  private async getWorldSnapshot(telegramId: string) {
    const currentSessionPromise =
      'getOptionalCurrentSession' in this.getMultiplayerSessionService &&
      typeof this.getMultiplayerSessionService.getOptionalCurrentSession === 'function'
        ? this.getMultiplayerSessionService.getOptionalCurrentSession(telegramId)
        : Promise.resolve(null);
    const activeMatchPromise =
      'executeOptional' in this.getActiveMatchService &&
      typeof this.getActiveMatchService.executeOptional === 'function'
        ? this.getActiveMatchService.executeOptional(telegramId)
        : Promise.resolve(null);

    const [player, status, currentSession, activeMatch] = await Promise.all([
      this.getPlayerCardService.execute(telegramId),
      this.getCareerStatusService.execute(telegramId),
      currentSessionPromise,
      activeMatchPromise
    ]);

    return { player, status, currentSession, activeMatch };
  }
}
