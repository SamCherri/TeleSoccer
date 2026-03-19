export enum MultiplayerLobbyStatus {
  Open = 'OPEN',
  Ready = 'READY',
  Closed = 'CLOSED'
}

export enum MultiplayerLobbyFillPolicy {
  HumanOnly = 'HUMAN_ONLY',
  HumanPriorityWithBotFallback = 'HUMAN_PRIORITY_WITH_BOT_FALLBACK'
}

export enum MultiplayerParticipantKind {
  Human = 'HUMAN',
  Bot = 'BOT'
}

export interface MultiplayerLobbyParticipantView {
  userId?: string;
  playerId?: string;
  playerName: string;
  telegramId?: string;
  isHost: boolean;
  slotNumber: number;
  kind: MultiplayerParticipantKind;
  joinedAt: Date;
}

export interface MultiplayerLobbyView {
  id: string;
  lobbyCode: string;
  status: MultiplayerLobbyStatus;
  fillPolicy: MultiplayerLobbyFillPolicy;
  maxParticipants: number;
  botFallbackEligibleSlots: number;
  createdAt: Date;
  readyForMatchAt?: Date;
  linkedMatchId?: string;
  hostPlayerId: string;
  hostPlayerName: string;
  participants: MultiplayerLobbyParticipantView[];
}

export interface MultiplayerLobbyStatusView extends MultiplayerLobbyView {
  canStartMatchPreparation: boolean;
  openHumanSlotCount: number;
  humanParticipantCount: number;
  botParticipantCount: number;
}
