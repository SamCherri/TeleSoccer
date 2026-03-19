export enum MultiplayerTeamSide {
  Home = 'HOME',
  Away = 'AWAY'
}

export enum MultiplayerParticipantKind {
  Human = 'HUMAN',
  Bot = 'BOT'
}

export enum MultiplayerSquadRole {
  Starter = 'STARTER',
  Substitute = 'SUBSTITUTE'
}

export enum MultiplayerSessionStatus {
  WaitingForPlayers = 'WAITING_FOR_PLAYERS',
  ReadyForFallback = 'READY_FOR_FALLBACK',
  ReadyToPrepare = 'READY_TO_PREPARE',
  PreparingMatch = 'PREPARING_MATCH',
  Closed = 'CLOSED'
}

export enum MultiplayerSessionFillPolicy {
  HumanOnly = 'HUMAN_ONLY',
  HumanPriorityWithBotFallback = 'HUMAN_PRIORITY_WITH_BOT_FALLBACK'
}

export interface MultiplayerSessionSlot {
  id: string;
  sessionId: string;
  side: MultiplayerTeamSide;
  slotNumber: number;
  squadRole: MultiplayerSquadRole;
  isBotFallbackEligible: boolean;
  occupiedByParticipantId?: string;
}

export interface MultiplayerSessionParticipant {
  id: string;
  sessionId: string;
  slotId: string;
  side: MultiplayerTeamSide;
  slotNumber: number;
  squadRole: MultiplayerSquadRole;
  kind: MultiplayerParticipantKind;
  userId?: string;
  playerId?: string;
  playerName: string;
  isHost: boolean;
  isCaptain: boolean;
  joinedAt: Date;
}

export interface MultiplayerSideSummary {
  side: MultiplayerTeamSide;
  starters: MultiplayerSessionParticipant[];
  substitutes: MultiplayerSessionParticipant[];
  humanCount: number;
  botCount: number;
  startersCount: number;
  substitutesCount: number;
  remainingStarterSlots: number;
  remainingSubstituteSlots: number;
  botFallbackEligibleOpenSlots: number;
}

export interface MultiplayerSessionSummary {
  id: string;
  code: string;
  hostUserId: string;
  fillPolicy: MultiplayerSessionFillPolicy;
  maxStartersPerSide: number;
  maxSubstitutesPerSide: number;
  botFallbackEligibleSlots: number;
  minimumHumansToStart?: number;
  linkedMatchId?: string;
  status: MultiplayerSessionStatus;
  createdAt: Date;
  updatedAt: Date;
  slots: MultiplayerSessionSlot[];
  participants: MultiplayerSessionParticipant[];
  home: MultiplayerSideSummary;
  away: MultiplayerSideSummary;
  totalHumanCount: number;
  totalBotCount: number;
  totalParticipants: number;
  fallbackEligibleOpenSlots: number;
  canUseBotFallbackNow: boolean;
  missingHumansToStart: number;
  hasHumanStarterOnEachSide: boolean;
  canPrepareMatch: boolean;
}

export interface CreateMultiplayerSessionResult {
  session: MultiplayerSessionSummary;
}

export interface JoinMultiplayerSessionResult {
  session: MultiplayerSessionSummary;
  participant: MultiplayerSessionParticipant;
}

export interface PrepareMultiplayerSessionResult {
  session: MultiplayerSessionSummary;
  botsAdded: MultiplayerSessionParticipant[];
}
