import { DomainError } from '../../shared/errors';
import { getPrismaClient } from './client';
import {
  AddBotFallbackInput,
  CreateMultiplayerSessionInput,
  deriveSessionSummary,
  JoinMultiplayerSessionInput,
  MultiplayerPlayerProfile,
  MultiplayerRepository
} from '../../domain/multiplayer/repository';
import {
  MultiplayerParticipantKind,
  MultiplayerSessionParticipant,
  MultiplayerSessionStatus,
  MultiplayerSessionSummary,
  MultiplayerSquadRole,
  MultiplayerTeamSide
} from '../../domain/multiplayer/types';

const sessionInclude = {
  participants: { orderBy: [{ side: 'asc' }, { squadRole: 'asc' }, { slotNumber: 'asc' }, { joinedAt: 'asc' }] }
} as const;

const sessionCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomSessionCode = (): string =>
  Array.from({ length: 6 }, () => sessionCodeAlphabet[Math.floor(Math.random() * sessionCodeAlphabet.length)]).join('');

const mapParticipant = (participant: any): MultiplayerSessionParticipant => ({
  id: participant.id,
  sessionId: participant.sessionId,
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
});

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
    participants: session.participants.map(mapParticipant)
  });

const nextOpenSlot = (participants: MultiplayerSessionParticipant[], side: MultiplayerTeamSide, squadRole: MultiplayerSquadRole, limit: number): number | null => {
  const used = new Set(
    participants.filter((participant) => participant.side === side && participant.squadRole === squadRole).map((participant) => participant.slotNumber)
  );

  for (let index = 1; index <= limit; index += 1) {
    if (!used.has(index)) {
      return index;
    }
  }

  return null;
};

const assignSlot = (
  session: MultiplayerSessionSummary,
  preferredSide?: MultiplayerTeamSide,
  preferredRole?: MultiplayerSquadRole
): { side: MultiplayerTeamSide; squadRole: MultiplayerSquadRole; slotNumber: number } => {
  const sides = preferredSide ? [preferredSide, preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home] : [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
  const roles = preferredRole ? [preferredRole, preferredRole === MultiplayerSquadRole.Starter ? MultiplayerSquadRole.Substitute : MultiplayerSquadRole.Starter] : [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];

  for (const side of sides) {
    for (const role of roles) {
      const limit = role === MultiplayerSquadRole.Starter ? session.maxStartersPerSide : session.maxSubstitutesPerSide;
      const slotNumber = nextOpenSlot(session.participants, side, role, limit);
      if (slotNumber) {
        return { side, squadRole: role, slotNumber };
      }
    }
  }

  throw new DomainError('A sessão já está lotada em todos os lados e elencos disponíveis.');
};

const shouldBeCaptain = (participants: MultiplayerSessionParticipant[], side: MultiplayerTeamSide, squadRole: MultiplayerSquadRole): boolean =>
  squadRole === MultiplayerSquadRole.Starter && !participants.some((participant) => participant.side === side && participant.isCaptain);

export class PrismaMultiplayerRepository implements MultiplayerRepository {
  async findPlayerProfileByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: { generation: { isCurrent: true, user: { telegramId } } },
      include: { generation: { include: { user: true } } }
    })) as { id: string; name: string; generation: { userId: string } } | null;

    if (!player) {
      return null;
    }

    return {
      userId: player.generation.userId,
      telegramId,
      playerId: player.id,
      playerName: player.name
    };
  }

  async createSession(input: CreateMultiplayerSessionInput): Promise<MultiplayerSessionSummary> {
    const prisma = getPrismaClient();
    const code = await this.generateUniqueCode();

    const session = await prisma.multiplayerSession.create({
      data: {
        code,
        hostUserId: input.hostUserId,
        fillPolicy: input.fillPolicy,
        maxStartersPerSide: input.maxStartersPerSide,
        maxSubstitutesPerSide: input.maxSubstitutesPerSide,
        botFallbackEligibleSlots: input.botFallbackEligibleSlots,
        minimumHumansToStart: input.minimumHumansToStart,
        status: MultiplayerSessionStatus.WaitingForPlayers,
        participants: {
          create: {
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
        }
      },
      include: sessionInclude
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

    return prisma.$transaction(async (tx) => {
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

      const { side, squadRole, slotNumber } = assignSlot(session, input.preferredSide, input.preferredRole);
      const participant = await tx.multiplayerSessionParticipant.create({
        data: {
          sessionId: session.id,
          side,
          slotNumber,
          squadRole,
          kind: MultiplayerParticipantKind.Human,
          userId: input.userId,
          playerId: input.playerId,
          playerName: input.playerName,
          isHost: false,
          isCaptain: shouldBeCaptain(session.participants, side, squadRole)
        }
      });

      const nextStatus = deriveNextStatus(mapSession(await tx.multiplayerSession.findUniqueOrThrow({ where: { id: session.id }, include: sessionInclude })));
      const updatedSession = await tx.multiplayerSession.update({
        where: { id: session.id },
        data: { status: nextStatus },
        include: sessionInclude
      });

      return { session: mapSession(updatedSession), participant: mapParticipant(participant) };
    });
  }

  async addBotFallbackParticipants(input: AddBotFallbackInput): Promise<MultiplayerSessionSummary> {
    const prisma = getPrismaClient();

    const session = await prisma.$transaction(async (tx) => {
      for (const bot of input.bots) {
        await tx.multiplayerSessionParticipant.create({
          data: {
            sessionId: input.sessionId,
            side: bot.side,
            slotNumber: bot.slotNumber,
            squadRole: bot.squadRole,
            kind: MultiplayerParticipantKind.Bot,
            playerName: bot.playerName,
            isHost: false,
            isCaptain: false
          }
        });
      }

      const reloaded = mapSession(await tx.multiplayerSession.findUniqueOrThrow({ where: { id: input.sessionId }, include: sessionInclude }));
      return tx.multiplayerSession.update({
        where: { id: input.sessionId },
        data: { status: deriveNextStatus(reloaded) },
        include: sessionInclude
      });
    });

    return mapSession(session);
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

const deriveNextStatus = (session: MultiplayerSessionSummary): MultiplayerSessionStatus => {
  if (session.canPrepareMatch) {
    return MultiplayerSessionStatus.ReadyToPrepare;
  }
  if (session.canUseBotFallback) {
    return MultiplayerSessionStatus.ReadyForFallback;
  }
  return MultiplayerSessionStatus.WaitingForPlayers;
};
