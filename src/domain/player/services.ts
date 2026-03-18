import { AttributeKey, CareerStatus, HistoryEntryType, TryoutStatus, WalletTransactionType } from '../shared/enums';
import { DomainError } from '../../shared/errors';
import { calculateInitialAttributes } from './attribute-calculator';
import { ClubRepository } from '../club/repository';
import { PlayerRepository } from './repository';
import { CreatePlayerInput, PlayerProfile, TrainingResult, TryoutResult } from './types';
import { getGameWeekNumber } from '../../shared/week';
import {
  PHASE1_PLAYER_STARTING_AGE,
  PHASE1_STARTING_WALLET_BALANCE,
  PHASE1_TRAINING_COST,
  PHASE1_TRAINING_GAIN,
  PHASE1_TRYOUT_COST,
  PHASE1_TRYOUT_REQUIRED_SCORE
} from './phase1-rules';

export class CreatePlayerService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(input: CreatePlayerInput): Promise<PlayerProfile> {
    this.validateInput(input);

    const existingPlayer = await this.playerRepository.findByTelegramId(input.telegramId);
    if (existingPlayer) {
      throw new DomainError('Este usuário já possui um jogador ativo.');
    }

    const attributes = calculateInitialAttributes(input.position, input.heightCm, input.weightKg);

    return this.playerRepository.createPlayer({
      ...input,
      generationNumber: 1,
      inheritedPoints: 0,
      startingWalletBalance: PHASE1_STARTING_WALLET_BALANCE,
      attributes,
      initialTransactions: [
        {
          type: WalletTransactionType.InitialGrant,
          amount: PHASE1_STARTING_WALLET_BALANCE,
          description: 'Saldo inicial da carreira'
        }
      ],
      initialHistory: [
        {
          type: HistoryEntryType.PlayerCreated,
          description: 'Jogador criado na Fase 1.',
          metadata: {
            position: input.position,
            dominantFoot: input.dominantFoot
          }
        }
      ]
    });
  }

  private validateInput(input: CreatePlayerInput): void {
    if (input.name.trim().length < 3) {
      throw new DomainError('O nome do jogador deve ter pelo menos 3 caracteres.');
    }
    if (input.heightCm < 150 || input.heightCm > 210) {
      throw new DomainError('A altura informada está fora do intervalo permitido.');
    }
    if (input.weightKg < 45 || input.weightKg > 120) {
      throw new DomainError('O peso informado está fora do intervalo permitido.');
    }
    if (!input.nationality.trim()) {
      throw new DomainError('A nacionalidade é obrigatória.');
    }
    if (!input.visual.skinTone.trim() || !input.visual.hairStyle.trim()) {
      throw new DomainError('As informações visuais são obrigatórias.');
    }
  }
}

export class GetPlayerCardService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(telegramId: string): Promise<PlayerProfile> {
    const player = await this.playerRepository.findByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Jogador não encontrado para este usuário.');
    }

    return player;
  }
}

export class WeeklyTrainingService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(telegramId: string, focus: AttributeKey, referenceDate = new Date()): Promise<TrainingResult> {
    const player = await this.playerRepository.findByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador antes de treinar.');
    }
    if (player.careerStatus !== CareerStatus.Youth && player.careerStatus !== CareerStatus.Professional) {
      throw new DomainError('Status de carreira inválido para treino.');
    }
    if (!(focus in player.attributes)) {
      throw new DomainError('Fundamento inválido para este jogador.');
    }
    if (player.walletBalance < PHASE1_TRAINING_COST) {
      throw new DomainError('Saldo insuficiente para realizar o treino semanal.');
    }

    const weekNumber = getGameWeekNumber(referenceDate);

    return this.playerRepository.applyTraining({
      playerId: player.id,
      focus,
      cost: PHASE1_TRAINING_COST,
      weekNumber,
      attributeGain: PHASE1_TRAINING_GAIN,
      walletTransaction: {
        type: WalletTransactionType.TrainingCost,
        amount: -PHASE1_TRAINING_COST,
        description: `Treino semanal de ${focus}`
      },
      historyEntry: {
        type: HistoryEntryType.TrainingCompleted,
        description: `Treino semanal concluído com foco em ${focus}.`,
        metadata: { focus, weekNumber, gain: PHASE1_TRAINING_GAIN }
      }
    });
  }
}

export class TryoutService {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly clubRepository: ClubRepository
  ) {}

  async execute(telegramId: string, referenceDate = new Date()): Promise<TryoutResult> {
    const player = await this.playerRepository.findByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador antes de tentar uma peneira.');
    }
    if (player.careerStatus === CareerStatus.Professional) {
      throw new DomainError('Este jogador já entrou no profissional.');
    }
    if (player.walletBalance < PHASE1_TRYOUT_COST) {
      throw new DomainError('Saldo insuficiente para pagar a peneira.');
    }

    await this.clubRepository.ensureStarterClubs();

    const weightedAttributes = [
      player.attributes[AttributeKey.Passing],
      player.attributes[AttributeKey.Shooting],
      player.attributes[AttributeKey.Dribbling],
      player.attributes[AttributeKey.Speed],
      player.attributes[AttributeKey.Marking],
      player.attributes[AttributeKey.Positioning],
      player.attributes[AttributeKey.Reflexes]
    ];

    const score = weightedAttributes.reduce((sum, value) => sum + value, 0);
    const approved = score >= PHASE1_TRYOUT_REQUIRED_SCORE;
    const club = approved ? await this.clubRepository.findStarterClubForTryout(score) : null;

    return this.playerRepository.registerTryout({
      playerId: player.id,
      weekNumber: getGameWeekNumber(referenceDate),
      cost: PHASE1_TRYOUT_COST,
      score,
      requiredScore: PHASE1_TRYOUT_REQUIRED_SCORE,
      approvedClubId: club?.id,
      approvedClubName: club?.name,
      walletTransaction: {
        type: WalletTransactionType.TryoutCost,
        amount: -PHASE1_TRYOUT_COST,
        description: 'Taxa de inscrição em peneira regional'
      },
      historyEntries: approved
        ? [
            {
              type: HistoryEntryType.TryoutApproved,
              description: `Peneira aprovada com entrada no clube ${club?.name}.`,
              metadata: { score, requiredScore: PHASE1_TRYOUT_REQUIRED_SCORE }
            },
            {
              type: HistoryEntryType.ProfessionalContractStarted,
              description: `Entrada no profissional registrada no clube ${club?.name}.`,
              metadata: { clubId: club?.id, clubName: club?.name }
            }
          ]
        : [
            {
              type: HistoryEntryType.TryoutFailed,
              description: 'Peneira reprovada. É necessário treinar e tentar novamente.',
              metadata: { score, requiredScore: PHASE1_TRYOUT_REQUIRED_SCORE }
            }
          ]
    });
  }
}

export const phase1Economy = {
  startingWalletBalance: PHASE1_STARTING_WALLET_BALANCE,
  trainingCost: PHASE1_TRAINING_COST,
  tryoutCost: PHASE1_TRYOUT_COST,
  tryoutRequiredScore: PHASE1_TRYOUT_REQUIRED_SCORE,
  trainingGain: PHASE1_TRAINING_GAIN,
  startingAge: PHASE1_PLAYER_STARTING_AGE,
  youthCareerStatus: CareerStatus.Youth,
  professionalCareerStatus: CareerStatus.Professional,
  approvedTryoutStatus: TryoutStatus.Approved
};
