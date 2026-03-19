import { MatchActionKey, MatchContextType, MatchEventType, MatchHalf, MatchPossessionSide, MatchRole, MatchStatus, MatchSummary, MatchTurnState, MatchTurnView, ResolveTurnResult } from './types';

export interface MatchPlayerProfile {
  playerId: string;
  telegramId: string;
  playerName: string;
  clubId?: string;
  clubName?: string;
  position: string;
  careerStatus: string;
  attributes: Record<string, number>;
}

export interface CreateMatchTurnInput {
  sequence: number;
  minute: number;
  half: MatchHalf;
  possessionSide: MatchPossessionSide;
  contextType: MatchContextType;
  contextText: string;
  availableActions: MatchActionKey[];
  deadlineAt: Date;
  isGoalkeeperContext: boolean;
  previousOutcome?: string;
}

export interface MatchResolutionInput {
  turnId: string;
  action?: MatchActionKey;
  turnState: MatchTurnState;
  outcomeText: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  half: MatchHalf;
  possessionSide: MatchPossessionSide;
  status: MatchStatus;
  energy: number;
  stoppageMinutes: number;
  yellowCardsDelta?: number;
  redCardIssued?: boolean;
  suspensionMatchesToAdd?: number;
  injury?: { severity: number; matchesRemaining: number; description: string };
  events: Array<{
    type: MatchEventType;
    minute: number;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
  nextTurn?: CreateMatchTurnInput;
}

export interface MatchRepository {
  findPlayerByTelegramId(telegramId: string): Promise<MatchPlayerProfile | null>;
  getActiveMatchByTelegramId(telegramId: string): Promise<MatchSummary | null>;
  getLatestMatchByTelegramId(telegramId: string): Promise<MatchSummary | null>;
  createMatchForPlayer(params: {
    telegramId: string;
    homeClubId: string;
    homeClubName: string;
    awayClubId: string;
    awayClubName: string;
    playerId: string;
    userRole: MatchRole;
    initialTurn: CreateMatchTurnInput;
  }): Promise<MatchSummary>;
  resolveTurn(matchId: string, resolution: MatchResolutionInput): Promise<ResolveTurnResult>;
  consumePendingSuspension(playerId: string): Promise<boolean>;
}
