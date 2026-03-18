import { AttributeKey, TryoutStatus, WalletTransactionType } from '../domain/shared/enums';
import {
  CreatePlayerService,
  GetCareerStatusService,
  GetPlayerCardService,
  GetWalletStatementService,
  TryoutService,
  WeeklyTrainingService
} from '../domain/player/services';
import { CreatePlayerInput } from '../domain/player/types';

export interface BotReply {
  text: string;
  actions: string[];
}

const walletTransactionLabels: Record<WalletTransactionType, string> = {
  [WalletTransactionType.InitialGrant]: 'Crédito inicial',
  [WalletTransactionType.TrainingCost]: 'Custo de treino',
  [WalletTransactionType.TryoutCost]: 'Taxa de peneira'
};

export class Phase1TelegramFacade {
  constructor(
    private readonly createPlayerService: CreatePlayerService,
    private readonly getPlayerCardService: GetPlayerCardService,
    private readonly getCareerStatusService: GetCareerStatusService,
    private readonly getWalletStatementService: GetWalletStatementService,
    private readonly weeklyTrainingService: WeeklyTrainingService,
    private readonly tryoutService: TryoutService
  ) {}

  async handleCreatePlayer(input: CreatePlayerInput): Promise<BotReply> {
    const player = await this.createPlayerService.execute(input);
    return {
      text: `Jogador ${player.name} criado com sucesso. Saldo inicial: ${player.walletBalance} moedas.`,
      actions: ['Ver ficha', 'Treino semanal', 'Tentar peneira', 'Status da carreira', 'Extrato da carteira']
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
      actions: ['Treino semanal', 'Tentar peneira', 'Status da carreira', 'Extrato da carteira']
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
      actions:
        status.careerStatus === 'PROFESSIONAL'
          ? ['Ver ficha', 'Status da carreira', 'Extrato da carteira']
          : ['Treino semanal', 'Tentar peneira', 'Ver ficha', 'Extrato da carteira']
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
      actions: ['Ver ficha', 'Status da carreira', 'Treino semanal', 'Tentar peneira']
    };
  }

  async handleWeeklyTraining(telegramId: string, focus: AttributeKey): Promise<BotReply> {
    const result = await this.weeklyTrainingService.execute(telegramId, focus);
    return {
      text: `Treino concluído em ${focus}. Novo valor: ${result.newValue}. Saldo restante: ${result.walletBalance}.`,
      actions: ['Ver ficha', 'Tentar peneira', 'Status da carreira', 'Extrato da carteira']
    };
  }

  async handleTryout(telegramId: string): Promise<BotReply> {
    const result = await this.tryoutService.execute(telegramId);
    return {
      text:
        result.status === TryoutStatus.Approved
          ? `Parabéns. Você foi aprovado na peneira e entrou no profissional pelo clube ${result.clubName}.`
          : `Você não foi aprovado na peneira. Pontuação ${result.score}/${result.requiredScore}.`,
      actions:
        result.status === TryoutStatus.Approved
          ? ['Ver ficha', 'Status da carreira', 'Extrato da carteira']
          : ['Treino semanal', 'Tentar peneira novamente', 'Status da carreira', 'Extrato da carteira']
    };
  }
}
