import { CareerStatus } from '../shared/enums';
import {
  MultiplayerParticipantKind,
  MultiplayerSessionFillPolicy,
  MultiplayerSessionParticipant,
  MultiplayerSessionSlot,
  MultiplayerSessionStatus,
  MultiplayerSessionSummary,
  MultiplayerSquadRole,
  MultiplayerTeamSide
} from './types';

export interface MultiplayerPlayerProfile {
  userId: string;
  telegramId: string;
  playerId?: string;
  playerName: string;
  careerStatus: CareerStatus;
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
    slotId: string;
    side: MultiplayerTeamSide;
    squadRole: MultiplayerSquadRole;
    slotNumber: number;
    playerName: string;
  }>;
}

export interface AddBotFallbackResult {
  session: MultiplayerSessionSummary;
  createdParticipants: MultiplayerSessionParticipant[];
}

export interface MultiplayerRepository {
  findPlayerProfileByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null>;
  createSession(input: CreateMultiplayerSessionInput): Promise<MultiplayerSessionSummary>;
  getSessionByCode(sessionCode: string): Promise<MultiplayerSessionSummary | null>;
  getCurrentSessionForTelegramUser(telegramId: string): Promise<MultiplayerSessionSummary | null>;
  joinSession(input: JoinMultiplayerSessionInput): Promise<{ session: MultiplayerSessionSummary; participant: MultiplayerSessionParticipant }>;
  addBotFallbackParticipants(input: AddBotFallbackInput): Promise<AddBotFallbackResult>;
  updateSessionStatus(sessionId: string, status: MultiplayerSessionStatus): Promise<MultiplayerSessionSummary>;
  findParticipantByUser(sessionId: string, userId: string): Promise<MultiplayerSessionParticipant | null>;
}

export const sideOrder = [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
export const squadRoleOrder = [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];

export const isHumanParticipant = (participant: MultiplayerSessionParticipant): boolean => participant.kind === MultiplayerParticipantKind.Human;

const sortParticipants = (participants: MultiplayerSessionParticipant[]): MultiplayerSessionParticipant[] =>
  [...participants].sort((left, right) => {
    if (left.side !== right.side) {
      return left.side.localeCompare(right.side);
    }
    if (left.squadRole !== right.squadRole) {
      return left.squadRole.localeCompare(right.squadRole);
    }
    return left.slotNumber - right.slotNumber;
  });

const sortSlots = (slots: MultiplayerSessionSlot[]): MultiplayerSessionSlot[] =>
  [...slots].sort((left, right) => {
    if (left.side !== right.side) {
      return left.side.localeCompare(right.side);
    }
    if (left.squadRole !== right.squadRole) {
      return left.squadRole.localeCompare(right.squadRole);
    }
    return left.slotNumber - right.slotNumber;
  });

export const buildSideSummary = (
  sessionId: string,
  side: MultiplayerTeamSide,
  participants: MultiplayerSessionParticipant[],
  slots: MultiplayerSessionSlot[]
) => {
  const sideParticipants = sortParticipants(participants).filter((participant) => participant.sessionId === sessionId && participant.side === side);
  const sideSlots = sortSlots(slots).filter((slot) => slot.sessionId === sessionId && slot.side === side);
  const starters = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Starter);
  const substitutes = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Substitute);
  const humanCount = sideParticipants.filter(isHumanParticipant).length;
  const botCount = sideParticipants.length - humanCount;
  const starterSlots = sideSlots.filter((slot) => slot.squadRole === MultiplayerSquadRole.Starter);
  const substituteSlots = sideSlots.filter((slot) => slot.squadRole === MultiplayerSquadRole.Substitute);
  const botFallbackEligibleOpenSlots = sideSlots.filter((slot) => slot.isBotFallbackEligible && !slot.occupiedByParticipantId).length;

  return {
    side,
    starters,
    substitutes,
    humanCount,
    botCount,
    startersCount: starters.length,
    substitutesCount: substitutes.length,
    remainingStarterSlots: Math.max(starterSlots.length - starters.length, 0),
    remainingSubstituteSlots: Math.max(substituteSlots.length - substitutes.length, 0),
    botFallbackEligibleOpenSlots
  };
};

export const deriveSessionSummary = (
  raw: Omit<
    MultiplayerSessionSummary,
    | 'home'
    | 'away'
    | 'totalHumanCount'
    | 'totalBotCount'
    | 'totalParticipants'
    | 'fallbackEligibleOpenSlots'
    | 'canUseBotFallbackNow'
    | 'missingHumansToStart'
    | 'hasHumanStarterOnEachSide'
    | 'canPrepareMatch'
  >
): MultiplayerSessionSummary => {
  const participants = sortParticipants(raw.participants);
  const slots = sortSlots(raw.slots).map((slot) => ({
    ...slot,
    occupiedByParticipantId: participants.find((participant) => participant.slotId === slot.id)?.id
  }));
  const home = buildSideSummary(raw.id, MultiplayerTeamSide.Home, participants, slots);
  const away = buildSideSummary(raw.id, MultiplayerTeamSide.Away, participants, slots);
  const totalHumanCount = participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length;
  const totalBotCount = participants.length - totalHumanCount;
  const totalParticipants = participants.length;
  const fallbackEligibleOpenSlots = slots.filter((slot) => slot.isBotFallbackEligible && !slot.occupiedByParticipantId).length;
  const minimumHumansToStart = raw.minimumHumansToStart ?? 2;
  const missingHumansToStart = Math.max(minimumHumansToStart - totalHumanCount, 0);
  const hasHumanStarterOnEachSide =
    home.starters.some((participant) => participant.kind === MultiplayerParticipantKind.Human) &&
    away.starters.some((participant) => participant.kind === MultiplayerParticipantKind.Human);
  const canUseBotFallbackNow =
    raw.fillPolicy === MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback &&
    raw.status !== MultiplayerSessionStatus.Closed &&
    hasHumanStarterOnEachSide &&
    missingHumansToStart === 0 &&
    fallbackEligibleOpenSlots > 0;
  const canPrepareMatch = hasHumanStarterOnEachSide && missingHumansToStart === 0 && fallbackEligibleOpenSlots === 0;

  return {
    ...raw,
    slots,
    participants,
    home,
    away,
    totalHumanCount,
    totalBotCount,
    totalParticipants,
    fallbackEligibleOpenSlots,
    canUseBotFallbackNow,
    missingHumansToStart,
    hasHumanStarterOnEachSide,
    canPrepareMatch
  };
};
