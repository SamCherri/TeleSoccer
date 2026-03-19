import { CareerStatus } from '../../domain/shared/enums';
import { DomainError } from '../../shared/errors';
import { getPrismaClient } from './client';
import {
  AddBotFallbackInput,
  AddBotFallbackResult,
  CreateMultiplayerSessionInput,
  deriveSessionSummary,
  JoinMultiplayerSessionInput,
  MultiplayerPlayerProfile,
  MultiplayerRepository
} from '../../domain/multiplayer/repository';
import {
  MultiplayerParticipantKind,
  MultiplayerSessionParticipant,
  MultiplayerSessionSlot,
  MultiplayerSessionStatus,
  MultiplayerSessionSummary,
  MultiplayerSquadRole,
  MultiplayerTeamSide
} from '../../domain/multiplayer/types';

const sessionInclude = {
  slots: { orderBy: [{ side: 'asc' }, { squadRole: 'asc' }, { slotNumber: 'asc' }] },
  participants: { include: { slot: true }, orderBy: [{ side: 'asc' }, { squadRole: 'asc' }, { slotNumber: 'asc' }, { joinedAt: 'asc' }] }
} as const;

const sessionCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomSessionCode = (): string =>
  Array.from({ length: 6 }, () => sessionCodeAlphabet[Math.floor(Math.random() * sessionCodeAlphabet.length)]).join('');

const isUniqueConflict = (error: unknown): boolean => Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');

const mapSlot = (slot: any): MultiplayerSessionSlot => ({
  id: slot.id,
  sessionId: slot.sessionId,
  side: slot.side,
  slotNumber: slot.slotNumber,
  squadRole: slot.squadRole,
  isBotFallbackEligible: slot.isBotFallbackEligible,
  occupiedByParticipantId: slot.participant?.id ?? undefined
});

const mapParticipant = (participant: any): MultiplayerSessionParticipant => {
  if (participant.slot) {
    const slotMatchesParticipant =
      participant.slot.id === participant.slotId &&
      participant.slot.side === participant.side &&
      participant.slot.squadRole === participant.squadRole &&
      participant.slot.slotNumber === participant.slotNumber;
    if (!slotMatchesParticipant) {
      throw new Error(`Inconsistência entre slot e participante na sessão multiplayer (${participant.id}).`);
    }
  }

  return {
    id: participant.id,
    sessionId: participant.sessionId,
    slotId: participant.slotId,
    side: participant.side,
    slotNumber: participant.slotNumber,
    squadRole: participant.squadRole,
    kind: participant.kind,
    userId: participant.userId ?? undefined,
    playerId: participant.playerId ?? undefined,
    playerName: participant.playerName,
    isHost: participant.isHost,
    isCaptain: participant.isCaptain,
    joinedAt: participant.joinedAt
  };
};

const mapSession = (session: any): MultiplayerSessionSummary =>
  deriveSessionSummary({
    id: session.id,
    code: session.code,
    hostUserId: session.hostUserId,
    fillPolicy: session.fillPolicy,
    maxStartersPerSide: session.maxStartersPerSide,
    maxSubstitutesPerSide: session.maxSubstitutesPerSide,
    botFallbackEligibleSlots: session.botFallbackEligibleSlots,
    minimumHumansToStart: session.minimumHumansToStart ?? undefined,
    linkedMatchId: session.linkedMatchId ?? undefined,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    slots: session.slots.map(mapSlot),
    participants: session.participants.map(mapParticipant)
  });

const buildSlotSeed = (
  preferredSide: MultiplayerTeamSide,
  preferredRole: MultiplayerSquadRole,
  maxStartersPerSide: number,
  maxSubstitutesPerSide: number,
  botFallbackEligibleSlots: number
) => {
  const allSlots: Array<{
    side: MultiplayerTeamSide;
    squadRole: MultiplayerSquadRole;
    slotNumber: number;
    isBotFallbackEligible: boolean;
  }> = [];

  for (const side of [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away]) {
    for (let slotNumber = 1; slotNumber <= maxStartersPerSide; slotNumber += 1) {
      allSlots.push({ side, squadRole: MultiplayerSquadRole.Starter, slotNumber, isBotFallbackEligible: false });
    }
    for (let slotNumber = 1; slotNumber <= maxSubstitutesPerSide; slotNumber += 1) {
      allSlots.push({ side, squadRole: MultiplayerSquadRole.Substitute, slotNumber, isBotFallbackEligible: false });
    }
  }

  const hostIndex = allSlots.findIndex(
    (slot) => slot.side === preferredSide && slot.squadRole === preferredRole && slot.slotNumber === 1
  );
  const otherSide = preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home;
  const fallbackPriority = [...allSlots]
    .filter((_, index) => index !== hostIndex)
    .filter((slot) => !(slot.squadRole === MultiplayerSquadRole.Starter && slot.slotNumber === 1))
    .sort((left, right) => {
      const leftPriority = left.squadRole === MultiplayerSquadRole.Starter ? 0 : 1;
      const rightPriority = right.squadRole === MultiplayerSquadRole.Starter ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      const leftSidePriority = left.side === otherSide ? 0 : 1;
      const rightSidePriority = right.side === otherSide ? 0 : 1;
      if (leftSidePriority !== rightSidePriority) {
        return leftSidePriority - rightSidePriority;
      }
      return left.slotNumber - right.slotNumber;
    })
    .slice(0, botFallbackEligibleSlots);

  const fallbackKeySet = new Set(fallbackPriority.map((slot) => `${slot.side}:${slot.squadRole}:${slot.slotNumber}`));
  return allSlots.map((slot) => ({
    ...slot,
    isBotFallbackEligible: fallbackKeySet.has(`${slot.side}:${slot.squadRole}:${slot.slotNumber}`)
  }));
};

const selectCandidateSlots = (
  session: MultiplayerSessionSummary,
  preferredSide?: MultiplayerTeamSide,
  preferredRole?: MultiplayerSquadRole
): MultiplayerSessionSlot[] => {
  const sides = preferredSide
    ? [preferredSide, preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home]
    : [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
  const roles = preferredRole
    ? [preferredRole, preferredRole === MultiplayerSquadRole.Starter ? MultiplayerSquadRole.Substitute : MultiplayerSquadRole.Starter]
    : [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];

  const ordered: MultiplayerSessionSlot[] = [];
  for (const side of sides) {
    for (const role of roles) {
      ordered.push(
        ...session.slots.filter((slot) => slot.side === side && slot.squadRole === role && !slot.occupiedByParticipantId).sort((left, right) => left.slotNumber - right.slotNumber)
      );
    }
  }

  return ordered;
};

const shouldBeCaptain = (participants: MultiplayerSessionParticipant[], side: MultiplayerTeamSide, squadRole: MultiplayerSquadRole): boolean =>
  squadRole === MultiplayerSquadRole.Starter && !participants.some((participant) => participant.side === side && participant.isCaptain);

const deriveNextStatus = (session: MultiplayerSessionSummary): MultiplayerSessionStatus => {
  if (session.canPrepareMatch) {
    return MultiplayerSessionStatus.ReadyToPrepare;
  }
  if (session.canUseBotFallbackNow) {
    return MultiplayerSessionStatus.ReadyForFallback;
  }
  return MultiplayerSessionStatus.WaitingForPlayers;
};

export class PrismaMultiplayerRepository implements MultiplayerRepository {
  async findPlayerProfileByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: { generation: { isCurrent: true, user: { telegramId } } },
      include: { generation: { include: { user: true } } }
    })) as { id: string; name: string; careerStatus: CareerStatus; generation: { userId: string } } | null;

    if (!player) {
      return null;
    }

    return {
      userId: player.generation.userId,
      telegramId,
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus
    };
  }

  async createSession(input: CreateMultiplayerSessionInput): Promise<MultiplayerSessionSummary> {
    const prisma = getPrismaClient();
    const code = await this.generateUniqueCode();
    const slotSeed = buildSlotSeed(
      input.preferredSide,
      input.preferredRole,
      input.maxStartersPerSide,
      input.maxSubstitutesPerSide,
      input.botFallbackEligibleSlots
    );

    const session = await prisma.$transaction(async (tx) => {
      const createdSession = (await tx.multiplayerSession.create({
        data: {
          code,
          hostUserId: input.hostUserId,
          fillPolicy: input.fillPolicy,
          maxStartersPerSide: input.maxStartersPerSide,
          maxSubstitutesPerSide: input.maxSubstitutesPerSide,
          botFallbackEligibleSlots: input.botFallbackEligibleSlots,
          minimumHumansToStart: input.minimumHumansToStart,
          status: MultiplayerSessionStatus.WaitingForPlayers,
          slots: { create: slotSeed }
        },
        include: sessionInclude
      })) as any;

      const hostSlot = createdSession.slots.find(
        (slot: any) => slot.side === input.preferredSide && slot.squadRole === input.preferredRole && slot.slotNumber === 1
      );
      if (!hostSlot) {
        throw new Error('Slot do host não encontrado para criar a sessão multiplayer.');
      }

      await tx.multiplayerSessionParticipant.create({
        data: {
          sessionId: createdSession.id,
          slotId: hostSlot.id,
          side: input.preferredSide,
          slotNumber: 1,
          squadRole: input.preferredRole,
          kind: MultiplayerParticipantKind.Human,
          userId: input.hostUserId,
          playerId: input.hostPlayerId,
          playerName: input.hostPlayerName,
          isHost: true,
          isCaptain: input.preferredRole === MultiplayerSquadRole.Starter
        }
      });

      return tx.multiplayerSession.findUniqueOrThrow({ where: { id: createdSession.id }, include: sessionInclude });
    });

    return mapSession(session);
  }

  async getSessionByCode(sessionCode: string): Promise<MultiplayerSessionSummary | null> {
    const prisma = getPrismaClient();
    const session = await prisma.multiplayerSession.findUnique({ where: { code: sessionCode }, include: sessionInclude });
    return session ? mapSession(session) : null;
  }

  async getCurrentSessionForTelegramUser(telegramId: string): Promise<MultiplayerSessionSummary | null> {
    const prisma = getPrismaClient();
    const session = await prisma.multiplayerSession.findFirst({
      where: {
        status: { not: MultiplayerSessionStatus.Closed },
        participants: { some: { user: { telegramId }, kind: MultiplayerParticipantKind.Human } }
      },
      orderBy: { updatedAt: 'desc' },
      include: sessionInclude
    });

    return session ? mapSession(session) : null;
  }

  async joinSession(input: JoinMultiplayerSessionInput): Promise<{ session: MultiplayerSessionSummary; participant: MultiplayerSessionParticipant }> {
    const prisma = getPrismaClient();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existingSession = await tx.multiplayerSession.findUnique({ where: { code: input.sessionCode }, include: sessionInclude });
          if (!existingSession) {
            throw new DomainError('Sessão multiplayer não encontrada.');
          }

          const session = mapSession(existingSession);
          const currentParticipant = session.participants.find(
            (participant) => participant.userId === input.userId && participant.kind === MultiplayerParticipantKind.Human
          );
          if (currentParticipant) {
            return { session, participant: currentParticipant };
          }

          const candidates = selectCandidateSlots(session, input.preferredSide, input.preferredRole);
          if (candidates.length === 0) {
            throw new DomainError('A sessão já está lotada em todos os lados e elencos disponíveis.');
          }

          const selectedSlot = candidates[0];
          let participant;
          try {
            participant = await tx.multiplayerSessionParticipant.create({
              data: {
                sessionId: session.id,
                slotId: selectedSlot.id,
                side: selectedSlot.side,
                slotNumber: selectedSlot.slotNumber,
                squadRole: selectedSlot.squadRole,
                kind: MultiplayerParticipantKind.Human,
                userId: input.userId,
                playerId: input.playerId,
                playerName: input.playerName,
                isHost: false,
                isCaptain: shouldBeCaptain(session.participants, selectedSlot.side, selectedSlot.squadRole)
              }
            });
          } catch (error) {
            if (isUniqueConflict(error)) {
              throw error;
            }
            throw error;
          }

          const updatedSession = mapSession(
            await tx.multiplayerSession.findUniqueOrThrow({ where: { id: session.id }, include: sessionInclude })
          );
          const normalizedSession =
            updatedSession.status === deriveNextStatus(updatedSession)
              ? updatedSession
              : mapSession(
                  await tx.multiplayerSession.update({
                    where: { id: session.id },
                    data: { status: deriveNextStatus(updatedSession) },
                    include: sessionInclude
                  })
                );

          return { session: normalizedSession, participant: mapParticipant(participant) };
        });
      } catch (error) {
        if (isUniqueConflict(error) && attempt < 3) {
          continue;
        }
        if (isUniqueConflict(error)) {
          throw new DomainError('A vaga desejada acabou de ser ocupada. Tente novamente para recalcular seu slot.');
        }
        throw error;
      }
    }

    throw new DomainError('Não foi possível entrar na sessão neste momento. Tente novamente.');
  }

  async addBotFallbackParticipants(input: AddBotFallbackInput): Promise<AddBotFallbackResult> {
    const prisma = getPrismaClient();

    return prisma.$transaction(async (tx) => {
      const createdParticipants: MultiplayerSessionParticipant[] = [];
      for (const bot of input.bots) {
        const existingOccupant = await tx.multiplayerSessionParticipant.findFirst({ where: { slotId: bot.slotId } });
        if (existingOccupant) {
          continue;
        }

        try {
          const created = await tx.multiplayerSessionParticipant.create({
            data: {
              sessionId: input.sessionId,
              slotId: bot.slotId,
              side: bot.side,
              slotNumber: bot.slotNumber,
              squadRole: bot.squadRole,
              kind: MultiplayerParticipantKind.Bot,
              playerName: bot.playerName,
              isHost: false,
              isCaptain: false
            }
          });
          createdParticipants.push(mapParticipant(created));
        } catch (error) {
          if (!isUniqueConflict(error)) {
            throw error;
          }
        }
      }

      const updatedSession = mapSession(await tx.multiplayerSession.findUniqueOrThrow({ where: { id: input.sessionId }, include: sessionInclude }));
      const normalizedSession =
        updatedSession.status === deriveNextStatus(updatedSession)
          ? updatedSession
          : mapSession(
              await tx.multiplayerSession.update({
                where: { id: input.sessionId },
                data: { status: deriveNextStatus(updatedSession) },
                include: sessionInclude
              })
            );

      return { session: normalizedSession, createdParticipants };
    });
  }

  async updateSessionStatus(sessionId: string, status: MultiplayerSessionStatus): Promise<MultiplayerSessionSummary> {
    const prisma = getPrismaClient();
    const session = await prisma.multiplayerSession.update({ where: { id: sessionId }, data: { status }, include: sessionInclude });
    return mapSession(session);
  }

  async findParticipantByUser(sessionId: string, userId: string): Promise<MultiplayerSessionParticipant | null> {
    const prisma = getPrismaClient();
    const participant = await prisma.multiplayerSessionParticipant.findFirst({
      where: { sessionId, userId, kind: MultiplayerParticipantKind.Human }
    });
    return participant ? mapParticipant(participant) : null;
  }

  private async generateUniqueCode(): Promise<string> {
    const prisma = getPrismaClient();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = randomSessionCode();
      const existing = await prisma.multiplayerSession.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }

    throw new Error('Não foi possível gerar um código único de sessão multiplayer.');
  }
}
