export enum MultiplayerLobbyStatus {
  Open = 'OPEN',
  Ready = 'READY',
  Closed = 'CLOSED'
}

export interface MultiplayerLobbyParticipantView {
  userId: string;
  playerId: string;
  playerName: string;
  telegramId: string;
  isHost: boolean;
  slotNumber: number;
  joinedAt: Date;
}

export interface MultiplayerLobbyView {
  id: string;
  lobbyCode: string;
  status: MultiplayerLobbyStatus;
  createdAt: Date;
  readyForMatchAt?: Date;
  linkedMatchId?: string;
  hostPlayerId: string;
  hostPlayerName: string;
  participants: MultiplayerLobbyParticipantView[];
}

export interface MultiplayerLobbyStatusView extends MultiplayerLobbyView {
  canStartMatchPreparation: boolean;
  openSlotCount: number;
}
