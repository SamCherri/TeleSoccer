import { AttributeKey } from '../shared/enums';
import { CreatePlayerInput, HistoryEntryRecord, PlayerProfile, TrainingResult, TryoutResult, WalletTransactionRecord } from './types';

export interface CreatePlayerPersistenceInput extends CreatePlayerInput {
  generationNumber: number;
  inheritedPoints: number;
  startingWalletBalance: number;
  attributes: Record<AttributeKey, number>;
  initialHistory: HistoryEntryRecord[];
  initialTransactions: WalletTransactionRecord[];
}

export interface PlayerRepository {
  createPlayer(input: CreatePlayerPersistenceInput): Promise<PlayerProfile>;
  findByTelegramId(telegramId: string): Promise<PlayerProfile | null>;
  applyTraining(params: {
    playerId: string;
    focus: AttributeKey;
    cost: number;
    weekNumber: number;
    attributeGain: number;
    walletTransaction: WalletTransactionRecord;
    historyEntry: HistoryEntryRecord;
  }): Promise<TrainingResult>;
  registerTryout(params: {
    playerId: string;
    weekNumber: number;
    cost: number;
    score: number;
    requiredScore: number;
    approvedClubId?: string;
    approvedClubName?: string;
    walletTransaction: WalletTransactionRecord;
    historyEntries: HistoryEntryRecord[];
  }): Promise<TryoutResult>;
}
