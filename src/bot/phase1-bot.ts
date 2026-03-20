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
  mainMenu: 'Menu principal',
  playerCard: 'Ver ficha',
  weeklyTraining: 'Treino semanal',
  tryout: 'Tentar peneira',
  confirmTryout: 'Confirmar peneira',
  careerStatus: 'Status da carreira',
  careerHistory: 'Histórico da carreira',
  walletStatement: 'Extrato da carteira',
  startMatch: 'Entrar em partida',
  currentMatch: 'Ver partida atual',
  resolveTimeout: 'Forçar perda do lance',
  mmorpgHub: '/mmorpg',
  createSession: 'Criar sessão online',
  currentSession: 'Ver sessão atual',
  prepareSession: 'Preparar confronto online',
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
      ({ execute: async () => { throw new DomainError('Partidas da Fase 2 não configuradas neste ambiente de teste.'); } } as unknown as GetActiveMatchService);
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
      return await this.handleMainMenu(telegramId);
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
      actions: this.buildMainMenuActions(player.careerStatus === CareerStatus.Professional)
    };
  }

  async handleMainMenu(telegramId: string): Promise<BotReply> {
    const player = await this.getPlayerCardService.execute(telegramId);
    return {
      text: [
        'Painel do jogador',
        `Nome: ${player.name}`,
        `Idade: ${player.age}`,
        `Posição: ${player.position}`,
        `Clube: ${player.currentClubName ?? 'Base amadora'}`,
        `Status: ${player.careerStatus}`,
        `Saldo: ${player.walletBalance} moedas`,
        'Mundo MMORPG: carreira, partida e sessão online ficam no mesmo fluxo. Use /mmorpg para entrar.'
      ].join('\n'),
      actions: this.buildMainMenuActions(player.careerStatus === CareerStatus.Professional)
    };
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
      actions: [...this.buildMainMenuActions(player.careerStatus === CareerStatus.Professional)]
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
      actions: this.buildMainMenuActions(status.careerStatus === CareerStatus.Professional)
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
      actions: this.buildMainMenuActions(history.careerStatus === CareerStatus.Professional)
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
      actions: this.buildMainMenuActions(statement.careerStatus === CareerStatus.Professional)
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
      actions: this.buildMainMenuActions(player.careerStatus === CareerStatus.Professional)
    };
  }

  async handleTryout(telegramId: string): Promise<BotReply> {
    const result = await this.tryoutService.execute(telegramId);
    return {
      text:
        result.status === TryoutStatus.Approved
          ? `Parabéns. Você foi aprovado na peneira e entrou no profissional pelo clube ${result.clubName}.`
          : `Você não foi aprovado na peneira. Pontuação ${result.score}/${result.requiredScore}.`,
      actions: this.buildMainMenuActions(result.status === TryoutStatus.Approved)
    };
  }

  async handleStartMatch(telegramId: string): Promise<BotReply> {
    const result = await this.startMatchService.execute(telegramId);
    return this.toMatchReply(result.match, 'Partida iniciada com sucesso.');
  }

  async handleCurrentMatch(telegramId: string): Promise<BotReply> {
    const match = await this.getActiveMatchService.execute(telegramId);
    return this.toMatchReply(match, match.status === MatchStatus.Finished ? 'Última partida encerrada.' : 'Status atual da partida.');
  }

  async handleMatchAction(telegramId: string, action?: MatchActionKey): Promise<BotReply> {
    const result = await this.resolveMatchTurnService.execute(telegramId, action);
    return this.toMatchReply(result.match, result.resolutionText);
  }

  async handleMultiplayerHub(telegramId: string): Promise<BotReply> {
    const player = await this.getPlayerCardService.execute(telegramId);
    const optionalSession = await this.getMultiplayerSessionService.getOptionalCurrentSession(telegramId);
    let activeMatch = null;
    try {
      activeMatch = await this.getActiveMatchService.execute(telegramId);
    } catch (error) {
      if (!(error instanceof DomainError)) {
        throw error;
      }
    }
    const sessionText = optionalSession
      ? this.renderer.renderMultiplayerSessionCard(optionalSession)
      : 'Nenhuma sessão compartilhada ativa encontrada para o seu usuário profissional.';

    return {
      text: [
        this.renderer.renderOnlineWorldCard({
          playerName: player.name,
          careerStatus: player.careerStatus,
          currentClubName: player.currentClubName ?? undefined,
          activeMatch,
          currentSession: optionalSession
        }),
        '🌐 TeleSoccer MMORPG Online',
        'A experiência online não é separada da carreira solo: a mesma progressão leva você para partidas e sessões compartilhadas.',
        'Arquitetura humano-first: dois lados, muitos humanos por sessão, titulares e reservas.',
        'Bots não são o padrão. Eles entram apenas como fallback elegível e controlado.',
        'Nesta etapa, criar, entrar, consultar e preparar sessão exige jogador profissional.',
        'Somente o host prepara a sessão antes da futura convergência com a partida compartilhada.',
        sessionText,
        `Para entrar em uma sala existente use: /entrar-sala CODIGO ${sideExample} ${roleExample}`
      ].join('\n\n'),
      actions: [
        phase1BotActions.startMatch,
        phase1BotActions.createSession,
        phase1BotActions.currentSession,
        phase1BotActions.prepareSession,
        phase1BotActions.mainMenu
      ]
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

    return {
      text: [
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away),
        'Sessão online criada dentro do mesmo fluxo MMORPG da carreira, com prioridade humana e fallback controlado apenas em slots marcados.',
        `Exemplo de entrada: /entrar-sala ${result.session.code} AWAY TITULAR`
      ].join('\n\n'),
      actions: [phase1BotActions.startMatch, phase1BotActions.currentSession, phase1BotActions.prepareSession, phase1BotActions.mmorpgHub, phase1BotActions.mainMenu]
    };
  }

  async handleCurrentSession(telegramId: string, sessionCode?: string): Promise<BotReply> {
    const session = await this.getMultiplayerSessionService.execute(telegramId, sessionCode);
    return {
      text: [
        this.renderer.renderMultiplayerSessionCard(session),
        this.renderer.renderMultiplayerSquadCard(session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(session, MultiplayerTeamSide.Away),
        this.renderer.renderMultiplayerPreparationCard(session)
      ].join('\n\n'),
      actions: [phase1BotActions.startMatch, phase1BotActions.prepareSession, phase1BotActions.mmorpgHub, phase1BotActions.mainMenu]
    };
  }

  async handleJoinSession(
    telegramId: string,
    sessionCode: string,
    preferredSide?: MultiplayerTeamSide,
    preferredRole?: MultiplayerSquadRole
  ): Promise<BotReply> {
    const result = await this.joinMultiplayerSessionService.execute(telegramId, sessionCode, { preferredSide, preferredRole });
    return {
      text: [
        `✅ Entrada confirmada na sala ${result.session.code}.`,
        `Você ocupou ${result.participant.side} | ${result.participant.squadRole} | slot ${result.participant.slotNumber}.`,
        'Você continua no mesmo mundo MMORPG da carreira; humano segue sendo prioridade e bots só entram depois, se o host preparar a sala e houver slot elegível.',
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away)
      ].join('\n\n'),
      actions: [phase1BotActions.startMatch, phase1BotActions.currentSession, phase1BotActions.prepareSession, phase1BotActions.mmorpgHub, phase1BotActions.mainMenu]
    };
  }

  async handlePrepareSession(telegramId: string, sessionCode?: string): Promise<BotReply> {
    const result = await this.prepareMultiplayerSessionService.execute(telegramId, sessionCode);
    const botSummary = result.botsAdded.length > 0
      ? `Fallback aplicado agora com ${result.botsAdded.length} bot(s) novo(s) nas vagas elegíveis.`
      : 'Nenhum bot novo foi necessário nesta preparação; a sessão permaneceu em priorização humana.';
    return {
      text: [
        botSummary,
        this.renderer.renderMultiplayerSessionCard(result.session),
        this.renderer.renderMultiplayerPreparationCard(result.session),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Home),
        this.renderer.renderMultiplayerSquadCard(result.session, MultiplayerTeamSide.Away)
      ].join('\n\n'),
      actions: [phase1BotActions.startMatch, phase1BotActions.currentSession, phase1BotActions.mmorpgHub, phase1BotActions.mainMenu]
    };
  }

  buildMainMenuActions(isProfessional: boolean): string[] {
    return [
      phase1BotActions.playerCard,
      phase1BotActions.careerStatus,
      phase1BotActions.careerHistory,
      phase1BotActions.walletStatement,
      phase1BotActions.weeklyTraining,
      phase1BotActions.mmorpgHub,
      ...(isProfessional ? [phase1BotActions.startMatch, phase1BotActions.currentMatch] : [phase1BotActions.tryout])
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

  private toMatchReply(match: Awaited<ReturnType<GetActiveMatchService['execute']>>, leadText: string): BotReply {
    const turn = match.activeTurn;

    return {
      text: [leadText, this.renderer.renderMatchCard(match)].join('\n\n'),
      actions:
        match.status === MatchStatus.Finished || !turn
          ? [phase1BotActions.mainMenu, phase1BotActions.startMatch, phase1BotActions.mmorpgHub]
          : [
              ...turn.availableActions.map((action) => matchActionLabels[action.key]),
              phase1BotActions.resolveTimeout,
              phase1BotActions.currentMatch,
              phase1BotActions.mmorpgHub,
              phase1BotActions.mainMenu
            ]
    };
  }
}
