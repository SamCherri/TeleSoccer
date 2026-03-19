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

export class Phase1TelegramFacade {
  private readonly startMatchService: StartMatchService;
  private readonly getActiveMatchService: GetActiveMatchService;
  private readonly resolveMatchTurnService: ResolveMatchTurnService;

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
    resolveMatchTurnService?: ResolveMatchTurnService
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
        `Saldo: ${player.walletBalance} moedas`
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

  buildMainMenuActions(isProfessional: boolean): string[] {
    return [
      phase1BotActions.playerCard,
      phase1BotActions.careerStatus,
      phase1BotActions.careerHistory,
      phase1BotActions.walletStatement,
      phase1BotActions.weeklyTraining,
      ...(isProfessional ? [phase1BotActions.startMatch, phase1BotActions.currentMatch] : [phase1BotActions.tryout])
    ];
  }

  private buildTrainingActions(isGoalkeeper: boolean): string[] {
    if (isGoalkeeper) {
      return [phase1BotActions.trainingReflexes, phase1BotActions.trainingPassing, phase1BotActions.mainMenu];
    }

    return [
      phase1BotActions.trainingPassing,
      phase1BotActions.trainingShooting,
      phase1BotActions.trainingDribbling,
      phase1BotActions.trainingSpeed,
      phase1BotActions.trainingMarking,
      phase1BotActions.mainMenu
    ];
  }

  private toMatchReply(match: Awaited<ReturnType<GetActiveMatchService['execute']>>, leadText: string): BotReply {
    const turn = match.activeTurn;
    const eventLines = match.recentEvents.slice(0, 4).map((event) => `- ${event.minute}' ${event.description}`);
    const injuryLine = match.injury
      ? `Lesão ativa: ${match.injury.description} (${match.injury.matchesRemaining} partida(s) restantes).`
      : 'Lesão ativa: nenhuma.';
    const text = [
      leadText,
      `${match.scoreboard.homeClubName} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${match.scoreboard.awayClubName}`,
      `Minuto: ${match.scoreboard.minute}' | Tempo: ${match.scoreboard.half} | Energia: ${match.energy}`,
      `Cartões: ${match.yellowCards} amarelo(s), ${match.redCards} vermelho(s).`,
      `Suspensão acumulada: ${match.suspensionMatchesRemaining} partida(s).`,
      injuryLine,
      turn
        ? [
            `Lance ${turn.sequence}: ${turn.contextText}`,
            turn.previousOutcome ? `Resultado anterior: ${turn.previousOutcome}` : undefined,
            `Prazo do turno: ${turn.deadlineAt.toISOString()}`
          ]
            .filter(Boolean)
            .join('\n')
        : 'Não há lance pendente no momento.',
      eventLines.length > 0 ? `Eventos recentes:\n${eventLines.join('\n')}` : 'Eventos recentes: sem registros.'
    ].join('\n');

    return {
      text,
      actions:
        match.status === MatchStatus.Finished || !turn
          ? [phase1BotActions.mainMenu, phase1BotActions.startMatch]
          : [...turn.availableActions.map((action) => matchActionLabels[action.key]), phase1BotActions.resolveTimeout, phase1BotActions.currentMatch, phase1BotActions.mainMenu]
    };
  }
}
