import { CareerStatus } from '../shared/enums';
import {
  MultiplayerLobbyFillPolicy,
  MultiplayerParticipantKind,
  MultiplayerLobbyStatus,
  MultiplayerLobbyStatusView,
  MultiplayerLobbyView
} from './types';

export interface MultiplayerPlayerProfile {
  userId: string;
  playerId: string;
  telegramId: string;
  playerName: string;
  careerStatus: CareerStatus;
  currentClubName?: string;
}

export interface CreateMultiplayerLobbyInput {
  lobbyCode: string;
  fillPolicy: MultiplayerLobbyFillPolicy;
  maxParticipants: number;
  hostUserId: string;
  hostPlayerId: string;
  hostPlayerName: string;
  hostTelegramId: string;
}

export interface JoinMultiplayerLobbyInput {
  lobbyId: string;
  userId: string;
  playerId: string;
  playerName: string;
  telegramId: string;
  participantKind: MultiplayerParticipantKind;
}

export interface MultiplayerLobbyRepository {
  findPlayerByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null>;
  findLobbyByCode(lobbyCode: string): Promise<MultiplayerLobbyView | null>;
  findActiveLobbyByTelegramId(telegramId: string): Promise<MultiplayerLobbyView | null>;
  createLobby(input: CreateMultiplayerLobbyInput): Promise<MultiplayerLobbyView>;
  joinLobby(input: JoinMultiplayerLobbyInput): Promise<MultiplayerLobbyView>;
  updateLobbyStatus(lobbyId: string, status: MultiplayerLobbyStatus, readyForMatchAt?: Date): Promise<MultiplayerLobbyView>;
  markBotFallbackEligible(lobbyId: string, eligibleSlots: number): Promise<MultiplayerLobbyView>;
  getLobbyStatus(lobbyId: string): Promise<MultiplayerLobbyStatusView | null>;
}
