import { CareerStatus } from '../../domain/shared/enums';
import {
  CreateMultiplayerLobbyInput,
  JoinMultiplayerLobbyInput,
  MultiplayerLobbyRepository,
  MultiplayerPlayerProfile
} from '../../domain/multiplayer/repository';
import {
  MultiplayerLobbyFillPolicy,
  MultiplayerParticipantKind,
  MultiplayerLobbyStatus,
  MultiplayerLobbyStatusView,
  MultiplayerLobbyView
} from '../../domain/multiplayer/types';
import { getPrismaClient } from './client';

interface MultiplayerPlayerRecord {
  id: string;
  name: string;
  careerStatus: CareerStatus;
  currentClub: { name: string } | null;
  generation: { user: { id: string; telegramId: string } };
}

interface MultiplayerLobbyRecord {
  id: string;
  lobbyCode: string;
  status: MultiplayerLobbyStatus;
  fillPolicy: MultiplayerLobbyFillPolicy;
  maxParticipants: number;
  botFallbackEligibleSlots: number;
  createdAt: Date;
  readyForMatchAt: Date | null;
  linkedMatchId: string | null;
  createdByPlayerId: string;
  createdByPlayer: { name: string };
  participants: Array<{
    userId: string | null;
    playerId: string | null;
    joinedAt: Date;
    isHost: boolean;
    slotNumber: number;
    kind: MultiplayerParticipantKind;
    user: { telegramId: string } | null;
    player: { name: string } | null;
  }>;
}

const lobbyInclude = {
  createdByPlayer: true,
  participants: {
    orderBy: { slotNumber: 'asc' },
    include: {
      user: true,
      player: true
    }
  }
};

const buildLobbyStatusView = (lobby: MultiplayerLobbyView): MultiplayerLobbyStatusView => {
  const humanParticipantCount = lobby.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length;
  const botParticipantCount = lobby.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot).length;

  return {
    ...lobby,
    canStartMatchPreparation: humanParticipantCount >= 2 && lobby.status === MultiplayerLobbyStatus.Ready,
    openHumanSlotCount: Math.max(0, lobby.maxParticipants - humanParticipantCount),
    humanParticipantCount,
    botParticipantCount
  };
};

export class PrismaMultiplayerLobbyRepository implements MultiplayerLobbyRepository {
  async findPlayerByTelegramId(telegramId: string): Promise<MultiplayerPlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: { generation: { isCurrent: true, user: { telegramId } } },
      include: { currentClub: true, generation: { include: { user: true } } }
    })) as MultiplayerPlayerRecord | null;

    if (!player) {
      return null;
    }

    return {
      userId: player.generation.user.id,
      playerId: player.id,
      telegramId: player.generation.user.telegramId,
      playerName: player.name,
      careerStatus: player.careerStatus,
      currentClubName: player.currentClub?.name ?? undefined
    };
  }

  async findLobbyByCode(lobbyCode: string): Promise<MultiplayerLobbyView | null> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.findUnique({
      where: { lobbyCode },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord | null;

    return lobby ? this.toLobbyView(lobby) : null;
  }

  async findActiveLobbyByTelegramId(telegramId: string): Promise<MultiplayerLobbyView | null> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.findFirst({
      where: {
        status: { in: [MultiplayerLobbyStatus.Open, MultiplayerLobbyStatus.Ready] },
        participants: { some: { user: { telegramId } } }
      },
      orderBy: { createdAt: 'desc' },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord | null;

    return lobby ? this.toLobbyView(lobby) : null;
  }

  async createLobby(input: CreateMultiplayerLobbyInput): Promise<MultiplayerLobbyView> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.create({
      data: {
        lobbyCode: input.lobbyCode,
        status: MultiplayerLobbyStatus.Open,
        fillPolicy: input.fillPolicy,
        maxParticipants: input.maxParticipants,
        botFallbackEligibleSlots: 0,
        hostUserId: input.hostUserId,
        createdByPlayerId: input.hostPlayerId,
        participants: {
          create: {
            userId: input.hostUserId,
            playerId: input.hostPlayerId,
            slotNumber: 1,
            kind: MultiplayerParticipantKind.Human,
            isHost: true
          }
        }
      },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord;

    return this.toLobbyView(lobby);
  }

  async joinLobby(input: JoinMultiplayerLobbyInput): Promise<MultiplayerLobbyView> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.update({
      where: { id: input.lobbyId },
      data: {
        botFallbackEligibleSlots: 0,
        participants: {
          create: {
            userId: input.userId,
            playerId: input.playerId,
            slotNumber: 2,
            kind: input.participantKind,
            isHost: false
          }
        }
      },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord;

    return this.toLobbyView(lobby);
  }

  async updateLobbyStatus(lobbyId: string, status: MultiplayerLobbyStatus, readyForMatchAt?: Date): Promise<MultiplayerLobbyView> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.update({
      where: { id: lobbyId },
      data: {
        status,
        readyForMatchAt: readyForMatchAt ?? null
      },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord;

    return this.toLobbyView(lobby);
  }

  async markBotFallbackEligible(lobbyId: string, eligibleSlots: number): Promise<MultiplayerLobbyView> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.update({
      where: { id: lobbyId },
      data: {
        botFallbackEligibleSlots: eligibleSlots
      },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord;

    return this.toLobbyView(lobby);
  }

  async getLobbyStatus(lobbyId: string): Promise<MultiplayerLobbyStatusView | null> {
    const prisma = getPrismaClient();
    const lobby = (await prisma.multiplayerLobby.findUnique({
      where: { id: lobbyId },
      include: lobbyInclude
    })) as MultiplayerLobbyRecord | null;

    return lobby ? buildLobbyStatusView(this.toLobbyView(lobby)) : null;
  }

  private toLobbyView(lobby: MultiplayerLobbyRecord): MultiplayerLobbyView {
    return {
      id: lobby.id,
      lobbyCode: lobby.lobbyCode,
      status: lobby.status,
      fillPolicy: lobby.fillPolicy,
      maxParticipants: lobby.maxParticipants,
      botFallbackEligibleSlots: lobby.botFallbackEligibleSlots,
      createdAt: new Date(lobby.createdAt),
      readyForMatchAt: lobby.readyForMatchAt ? new Date(lobby.readyForMatchAt) : undefined,
      linkedMatchId: lobby.linkedMatchId ?? undefined,
      hostPlayerId: lobby.createdByPlayerId,
      hostPlayerName: lobby.createdByPlayer.name,
      participants: lobby.participants.map((participant) => ({
        userId: participant.userId ?? undefined,
        playerId: participant.playerId ?? undefined,
        playerName: participant.player?.name ?? 'Bot de fallback',
        telegramId: participant.user?.telegramId ?? undefined,
        isHost: participant.isHost,
        slotNumber: participant.slotNumber,
        kind: participant.kind,
        joinedAt: new Date(participant.joinedAt)
      }))
    };
  }
}
