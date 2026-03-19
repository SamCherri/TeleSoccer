import {
  MultiplayerParticipantKind,
  MultiplayerSessionFillPolicy,
  MultiplayerSessionParticipant,
  MultiplayerSessionSummary,
  MultiplayerSessionStatus,
  MultiplayerSquadRole,
  MultiplayerTeamSide
} from './types';

export interface MultiplayerPlayerProfile {
  userId: string;
  telegramId: string;
  playerId?: string;
  playerName: string;
}

export interface CreateMultiplayerSessionInput {
  telegramId: string;
  hostUserId: string;
  hostPlayerId?: string;
  hostPlayerName: string;
  preferredSide: MultiplayerTeamSide;
  preferredRole: MultiplayerSquadRole;
  fillPolicy: MultiplayerSessionFillPolicy;
  maxStartersPerSide: number;
  maxSubstitutesPerSide: number;
  botFallbackEligibleSlots: number;
  minimumHumansToStart?: number;
}

export interface JoinMultiplayerSessionInput {
  sessionCode: string;
  telegramId: string;
  userId: string;
  playerId?: string;
  playerName: string;
  preferredSide?: MultiplayerTeamSide;
  preferredRole?: MultiplayerSquadRole;
}

export interface AddBotFallbackInput {
  sessionId: string;
  bots: Array<{
    side: MultiplayerTeamSide;
    squadRole: MultiplayerSquadRole;
    slotNumber: number;
    playerName: string;
  }>;
}

export interface MultiplayerRepository {
  findPlayerProfileByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null>;
  createSession(input: CreateMultiplayerSessionInput): Promise<MultiplayerSessionSummary>;
  getSessionByCode(sessionCode: string): Promise<MultiplayerSessionSummary | null>;
  getCurrentSessionForTelegramUser(telegramId: string): Promise<MultiplayerSessionSummary | null>;
  joinSession(input: JoinMultiplayerSessionInput): Promise<{ session: MultiplayerSessionSummary; participant: MultiplayerSessionParticipant }>;
  addBotFallbackParticipants(input: AddBotFallbackInput): Promise<MultiplayerSessionSummary>;
  updateSessionStatus(sessionId: string, status: MultiplayerSessionStatus): Promise<MultiplayerSessionSummary>;
  findParticipantByUser(sessionId: string, userId: string): Promise<MultiplayerSessionParticipant | null>;
}

export const sideOrder = [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
export const squadRoleOrder = [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];

export const isHumanParticipant = (participant: MultiplayerSessionParticipant): boolean => participant.kind === MultiplayerParticipantKind.Human;

export const buildSideSummary = (
  sessionId: string,
  side: MultiplayerTeamSide,
  participants: MultiplayerSessionParticipant[],
  maxStartersPerSide: number,
  maxSubstitutesPerSide: number
) => {
  const sideParticipants = participants
    .filter((participant) => participant.sessionId === sessionId && participant.side === side)
    .sort((left, right) => {
      if (left.squadRole !== right.squadRole) {
        return left.squadRole.localeCompare(right.squadRole);
      }
      return left.slotNumber - right.slotNumber;
    });
  const starters = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Starter);
  const substitutes = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Substitute);
  const humanCount = sideParticipants.filter(isHumanParticipant).length;
  const botCount = sideParticipants.length - humanCount;

  return {
    side,
    starters,
    substitutes,
    humanCount,
    botCount,
    startersCount: starters.length,
    substitutesCount: substitutes.length,
    remainingStarterSlots: Math.max(maxStartersPerSide - starters.length, 0),
    remainingSubstituteSlots: Math.max(maxSubstitutesPerSide - substitutes.length, 0)
  };
};

export const deriveSessionSummary = (
  raw: Omit<MultiplayerSessionSummary, 'home' | 'away' | 'totalHumanCount' | 'totalBotCount' | 'totalParticipants' | 'fallbackEligibleOpenSlots' | 'canUseBotFallback' | 'missingHumansToStart' | 'canPrepareMatch'>
): MultiplayerSessionSummary => {
  const home = buildSideSummary(raw.id, MultiplayerTeamSide.Home, raw.participants, raw.maxStartersPerSide, raw.maxSubstitutesPerSide);
  const away = buildSideSummary(raw.id, MultiplayerTeamSide.Away, raw.participants, raw.maxStartersPerSide, raw.maxSubstitutesPerSide);
  const totalHumanCount = raw.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length;
  const totalBotCount = raw.participants.length - totalHumanCount;
  const totalParticipants = raw.participants.length;
  const openSlots = home.remainingStarterSlots + home.remainingSubstituteSlots + away.remainingStarterSlots + away.remainingSubstituteSlots;
  const fallbackEligibleOpenSlots = Math.min(raw.botFallbackEligibleSlots, openSlots);
  const minimumHumansToStart = raw.minimumHumansToStart ?? 2;
  const missingHumansToStart = Math.max(minimumHumansToStart - totalHumanCount, 0);
  const eachSideHasStarter = home.startersCount > 0 && away.startersCount > 0;
  const canUseBotFallback =
    raw.fillPolicy === MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback && fallbackEligibleOpenSlots > 0 && raw.status !== MultiplayerSessionStatus.Closed;
  const canPrepareMatch = eachSideHasStarter && missingHumansToStart === 0;

  return {
    ...raw,
    home,
    away,
    totalHumanCount,
    totalBotCount,
    totalParticipants,
    fallbackEligibleOpenSlots,
    canUseBotFallback,
    missingHumansToStart,
    canPrepareMatch
  };
};
