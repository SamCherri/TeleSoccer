import { AttributeKey, CareerStatus, DominantFoot, HistoryEntryType, PlayerPosition, TryoutStatus, WalletTransactionType } from '../shared/enums';

export type PlayerAttributes = Record<AttributeKey, number>;

export interface PlayerVisual {
  skinTone: string;
  hairStyle: string;
}

export interface CreatePlayerInput {
  telegramId: string;
  name: string;
  nationality: string;
  position: PlayerPosition;
  dominantFoot: DominantFoot;
  heightCm: number;
  weightKg: number;
  visual: PlayerVisual;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  generationId: string;
  name: string;
  nationality: string;
  position: PlayerPosition;
  dominantFoot: DominantFoot;
  age: number;
  heightCm: number;
  weightKg: number;
  visual: PlayerVisual;
  careerStatus: CareerStatus;
  currentClubId?: string;
  currentClubName?: string;
  walletBalance: number;
  createdAt: Date;
  attributes: PlayerAttributes;
  trainingHistoryCount: number;
  tryoutHistoryCount: number;
}

export interface CareerHistoryItem {
  type: HistoryEntryType;
  description: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CareerStatusView {
  playerId: string;
  playerName: string;
  careerStatus: CareerStatus;
  age: number;
  currentClubName?: string;
  walletBalance: number;
  totalTrainings: number;
  totalTryouts: number;
  lastTrainingWeek?: number;
  trainingAvailableThisWeek: boolean;
  currentWeekNumber: number;
  latestTryout?: {
    status: TryoutStatus;
    score: number;
    requiredScore: number;
    clubName?: string;
    createdAt: Date;
  };
  recentHistory: CareerHistoryItem[];
}

export interface CareerHistoryView {
  playerId: string;
  playerName: string;
  careerStatus: CareerStatus;
  currentClubName?: string;
  totalEntries: number;
  entries: CareerHistoryItem[];
}

export interface WalletStatementItem {
  type: WalletTransactionType;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface WalletStatementView {
  playerId: string;
  playerName: string;
  careerStatus: CareerStatus;
  walletBalance: number;
  transactionCount: number;
  recentTransactions: WalletStatementItem[];
}

export interface TrainingResult {
  playerId: string;
  focus: AttributeKey;
  newValue: number;
  cost: number;
  walletBalance: number;
  weekNumber: number;
}

export interface TryoutResult {
  playerId: string;
  status: TryoutStatus;
  score: number;
  requiredScore: number;
  cost: number;
  walletBalance: number;
  clubName?: string;
}

export interface WalletTransactionRecord {
  type: WalletTransactionType;
  amount: number;
  description: string;
}

export interface HistoryEntryRecord {
  type: HistoryEntryType;
  description: string;
  metadata?: Record<string, unknown>;
}
