import { CareerStatus, HistoryEntryType, TryoutStatus } from '../../domain/shared/enums';
import { DomainError } from '../../shared/errors';
import { CreatePlayerPersistenceInput, PlayerRepository } from '../../domain/player/repository';
import { CareerStatusView, PlayerProfile, TrainingResult, TryoutResult, WalletStatementView } from '../../domain/player/types';
import { getPrismaClient } from './client';
import { PHASE1_PLAYER_STARTING_AGE } from '../../domain/player/phase1-rules';

interface PlayerGenerationRecord {
  id: string;
  userId: string;
}

interface ClubRecord {
  name: string;
}

interface PlayerAttributeRecord {
  key: string;
  value: number;
}

interface WalletTransactionEntryRecord {
  type: WalletStatementView['recentTransactions'][number]['type'];
  amount: number;
  description: string;
  createdAt: Date | string;
}

interface WalletRecord {
  balance: number;
  transactions?: WalletTransactionEntryRecord[];
}

interface PlayerWithRelationsRecord {
  id: string;
  generationId: string;
  name: string;
  nationality: string;
  position: PlayerProfile['position'];
  dominantFoot: PlayerProfile['dominantFoot'];
  age: number;
  heightCm: number;
  weightKg: number;
  skinTone: string;
  hairStyle: string;
  careerStatus: PlayerProfile['careerStatus'];
  currentClubId: string | null;
  currentClub: ClubRecord | null;
  createdAt: Date | string;
  generation: PlayerGenerationRecord;
  attributes: PlayerAttributeRecord[];
  wallet: WalletRecord | null;
  trainingSessions: unknown[];
  tryoutAttempts: unknown[];
}

interface WalletOwnerRecord {
  wallet: WalletRecord | null;
}

interface PlayerHistoryEntryRecord {
  type: CareerStatusView['recentHistory'][number]['type'];
  description: string;
  createdAt: Date | string;
}

interface TryoutAttemptRecord {
  status: TryoutResult['status'];
  score: number;
  requiredScore: number;
  createdAt: Date | string;
  club: ClubRecord | null;
}

interface TrainingSessionCreateData {
  playerId: string;
  weekNumber: number;
  focus: string;
  cost: number;
  attributeGain: number;
}

export const buildTrainingSessionCreateData = (params: {
  playerId: string;
  weekNumber: number;
  focus: string;
  cost: number;
  attributeGain: number;
}): TrainingSessionCreateData => ({
  playerId: params.playerId,
  weekNumber: params.weekNumber,
  focus: params.focus,
  cost: params.cost,
  attributeGain: params.attributeGain
});

export class PrismaPlayerRepository implements PlayerRepository {
  async createPlayer(input: CreatePlayerPersistenceInput): Promise<PlayerProfile> {
    const prisma = getPrismaClient();

    const player = (await prisma.$transaction(async (tx) => {
      const user = (await tx.user.upsert({
        where: { telegramId: input.telegramId },
        update: {},
        create: { telegramId: input.telegramId }
      })) as { id: string };

      await tx.playerGeneration.updateMany({
        where: { userId: user.id, isCurrent: true },
        data: { isCurrent: false }
      });

      const generation = (await tx.playerGeneration.create({
        data: {
          userId: user.id,
          generationNumber: input.generationNumber,
          inheritedPoints: input.inheritedPoints,
          isCurrent: true
        }
      })) as { id: string };

      return tx.player.create({
        data: {
          generationId: generation.id,
          name: input.name,
          nationality: input.nationality,
          position: input.position,
          dominantFoot: input.dominantFoot,
          age: PHASE1_PLAYER_STARTING_AGE,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          skinTone: input.visual.skinTone,
          hairStyle: input.visual.hairStyle,
          careerStatus: CareerStatus.Youth,
          attributes: {
            create: Object.entries(input.attributes).map(([key, value]) => ({ key, value }))
          },
          wallet: {
            create: {
              balance: input.startingWalletBalance,
              transactions: {
                create: input.initialTransactions
              }
            }
          },
          historyEntries: {
            create: input.initialHistory
          }
        },
        include: this.playerInclude()
      });
    })) as PlayerWithRelationsRecord;

    return this.toProfile(player);
  }

  async findByTelegramId(telegramId: string): Promise<PlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: {
        generation: {
          isCurrent: true,
          user: { telegramId }
        }
      },
      include: this.playerInclude()
    })) as PlayerWithRelationsRecord | null;

    return player ? this.toProfile(player) : null;
  }

  async getWalletStatementByTelegramId(telegramId: string, transactionLimit: number): Promise<WalletStatementView | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: {
        generation: {
          isCurrent: true,
          user: { telegramId }
        }
      },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: transactionLimit
            }
          }
        }
      }
    })) as ({ id: string; name: string; wallet: WalletRecord | null }) | null;

    if (!player?.wallet) {
      return null;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      walletBalance: player.wallet.balance,
      transactionCount: player.wallet.transactions?.length ?? 0,
      recentTransactions: (player.wallet.transactions ?? []).map((transaction) => ({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: new Date(transaction.createdAt)
      }))
    };
  }

  async getCareerStatusByTelegramId(telegramId: string, currentWeekNumber: number): Promise<CareerStatusView | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: {
        generation: {
          isCurrent: true,
          user: { telegramId }
        }
      },
      include: this.playerInclude()
    })) as PlayerWithRelationsRecord | null;

    if (!player) {
      return null;
    }

    const [latestTryout, latestTraining, recentHistory] = await prisma.$transaction(async (tx) => {
      const latestTryoutEntry = (await tx.tryoutAttempt.findFirst({
        where: { playerId: player.id },
        orderBy: { createdAt: 'desc' },
        include: { club: true }
      })) as TryoutAttemptRecord | null;

      const latestTrainingEntry = (await tx.trainingSession.findFirst({
        where: { playerId: player.id },
        orderBy: [{ weekNumber: 'desc' }, { createdAt: 'desc' }]
      })) as { weekNumber: number } | null;

      const recentHistoryEntries = (await tx.playerHistoryEntry.findMany({
        where: { playerId: player.id },
        orderBy: { createdAt: 'desc' },
        take: 5
      })) as PlayerHistoryEntryRecord[];

      return [latestTryoutEntry, latestTrainingEntry, recentHistoryEntries] as const;
    });

    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      age: player.age,
      currentClubName: player.currentClub?.name ?? undefined,
      walletBalance: player.wallet?.balance ?? 0,
      totalTrainings: player.trainingSessions.length,
      totalTryouts: player.tryoutAttempts.length,
      lastTrainingWeek: latestTraining?.weekNumber,
      trainingAvailableThisWeek: latestTraining?.weekNumber !== currentWeekNumber,
      currentWeekNumber,
      latestTryout: latestTryout
        ? {
            status: latestTryout.status,
            score: latestTryout.score,
            requiredScore: latestTryout.requiredScore,
            clubName: latestTryout.club?.name ?? undefined,
            createdAt: new Date(latestTryout.createdAt)
          }
        : undefined,
      recentHistory: recentHistory.map((entry) => ({
        type: entry.type,
        description: entry.description,
        createdAt: new Date(entry.createdAt)
      }))
    };
  }

  async applyTraining(params: {
    playerId: string;
    focus: string;
    cost: number;
    weekNumber: number;
    attributeGain: number;
    walletTransaction: { type: string; amount: number; description: string };
    historyEntry: { type: HistoryEntryType; description: string; metadata?: Record<string, unknown> };
  }): Promise<TrainingResult> {
    const prisma = getPrismaClient();

    const result = (await prisma.$transaction(async (tx) => {
      const existing = await tx.trainingSession.findUnique({
        where: { playerId_weekNumber: { playerId: params.playerId, weekNumber: params.weekNumber } }
      });
      if (existing) {
        throw new DomainError('O treino desta semana já foi utilizado.');
      }

      const player = (await tx.player.findUnique({
        where: { id: params.playerId },
        include: { wallet: true, attributes: true }
      })) as ({ attributes: PlayerAttributeRecord[] } & WalletOwnerRecord) | null;

      if (!player?.wallet) {
        throw new DomainError('Carteira do jogador não encontrada.');
      }
      if (player.wallet.balance < params.cost) {
        throw new DomainError('Saldo insuficiente para treino.');
      }

      const targetAttribute = player.attributes.find((attribute) => attribute.key === params.focus);
      if (!targetAttribute) {
        throw new DomainError('Atributo de treino não encontrado.');
      }

      await tx.trainingSession.create({
        data: buildTrainingSessionCreateData({
          playerId: params.playerId,
          weekNumber: params.weekNumber,
          focus: params.focus,
          cost: params.cost,
          attributeGain: params.attributeGain
        })
      });

      await tx.playerAttribute.update({
        where: { playerId_key: { playerId: params.playerId, key: params.focus } },
        data: { value: { increment: params.attributeGain } }
      });

      const wallet = (await tx.wallet.update({
        where: { playerId: params.playerId },
        data: {
          balance: { decrement: params.cost },
          transactions: { create: params.walletTransaction }
        }
      })) as WalletRecord;

      await tx.playerHistoryEntry.create({
        data: {
          playerId: params.playerId,
          type: params.historyEntry.type,
          description: params.historyEntry.description,
          metadata: params.historyEntry.metadata
        }
      });

      return {
        newValue: targetAttribute.value + params.attributeGain,
        walletBalance: wallet.balance
      };
    })) as { newValue: number; walletBalance: number };

    return {
      playerId: params.playerId,
      focus: params.focus as TrainingResult['focus'],
      newValue: result.newValue,
      cost: params.cost,
      walletBalance: result.walletBalance,
      weekNumber: params.weekNumber
    };
  }

  async registerTryout(params: {
    playerId: string;
    weekNumber: number;
    cost: number;
    score: number;
    requiredScore: number;
    approvedClubId?: string;
    approvedClubName?: string;
    walletTransaction: { type: string; amount: number; description: string };
    historyEntries: { type: HistoryEntryType; description: string; metadata?: Record<string, unknown> }[];
  }): Promise<TryoutResult> {
    const prisma = getPrismaClient();
    const approved = Boolean(params.approvedClubId && params.approvedClubName);

    const result = (await prisma.$transaction(async (tx) => {
      const player = (await tx.player.findUnique({
        where: { id: params.playerId },
        include: { wallet: true }
      })) as WalletOwnerRecord | null;

      if (!player?.wallet) {
        throw new DomainError('Carteira do jogador não encontrada.');
      }
      if (player.wallet.balance < params.cost) {
        throw new DomainError('Saldo insuficiente para peneira.');
      }

      const wallet = (await tx.wallet.update({
        where: { playerId: params.playerId },
        data: {
          balance: { decrement: params.cost },
          transactions: { create: params.walletTransaction }
        }
      })) as WalletRecord;

      await tx.tryoutAttempt.create({
        data: {
          playerId: params.playerId,
          cost: params.cost,
          weekNumber: params.weekNumber,
          score: params.score,
          requiredScore: params.requiredScore,
          status: approved ? TryoutStatus.Approved : TryoutStatus.Failed,
          clubId: params.approvedClubId
        }
      });

      if (approved) {
        await tx.clubMembership.updateMany({
          where: { playerId: params.playerId, isActive: true },
          data: { isActive: false }
        });

        await tx.clubMembership.create({
          data: {
            playerId: params.playerId,
            clubId: params.approvedClubId,
            role: 'PLAYER',
            isActive: true
          }
        });

        await tx.player.update({
          where: { id: params.playerId },
          data: {
            careerStatus: CareerStatus.Professional,
            currentClubId: params.approvedClubId
          }
        });
      }

      for (const entry of params.historyEntries) {
        await tx.playerHistoryEntry.create({
          data: {
            playerId: params.playerId,
            type: entry.type,
            description: entry.description,
            metadata: entry.metadata
          }
        });
      }

      return { walletBalance: wallet.balance };
    })) as { walletBalance: number };

    return {
      playerId: params.playerId,
      status: approved ? TryoutStatus.Approved : TryoutStatus.Failed,
      score: params.score,
      requiredScore: params.requiredScore,
      cost: params.cost,
      walletBalance: result.walletBalance,
      clubName: params.approvedClubName
    };
  }

  private playerInclude() {
    return {
      generation: true,
      currentClub: true,
      attributes: true,
      wallet: { include: { transactions: true } },
      trainingSessions: true,
      tryoutAttempts: true
    };
  }

  private toProfile(player: PlayerWithRelationsRecord): PlayerProfile {
    return {
      id: player.id,
      userId: player.generation.userId,
      generationId: player.generationId,
      name: player.name,
      nationality: player.nationality,
      position: player.position,
      dominantFoot: player.dominantFoot,
      age: player.age,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      visual: {
        skinTone: player.skinTone,
        hairStyle: player.hairStyle
      },
      careerStatus: player.careerStatus,
      currentClubId: player.currentClubId ?? undefined,
      currentClubName: player.currentClub?.name ?? undefined,
      walletBalance: player.wallet?.balance ?? 0,
      createdAt: new Date(player.createdAt),
      attributes: Object.fromEntries(player.attributes.map((attribute) => [attribute.key, attribute.value])) as PlayerProfile['attributes'],
      trainingHistoryCount: player.trainingSessions.length,
      tryoutHistoryCount: player.tryoutAttempts.length
    };
  }
}
