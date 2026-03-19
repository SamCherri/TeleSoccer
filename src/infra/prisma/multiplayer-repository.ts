import { CareerStatus } from '../../domain/shared/enums';
import {
  CreateMultiplayerLobbyInput,
  JoinMultiplayerLobbyInput,
  MultiplayerLobbyRepository,
  MultiplayerPlayerProfile
} from '../../domain/multiplayer/repository';
import { MultiplayerLobbyStatus, MultiplayerLobbyStatusView, MultiplayerLobbyView } from '../../domain/multiplayer/types';
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
  createdAt: Date;
  readyForMatchAt: Date | null;
  linkedMatchId: string | null;
  createdByPlayerId: string;
  createdByPlayer: { name: string };
  participants: Array<{
    userId: string;
    playerId: string;
    joinedAt: Date;
    isHost: boolean;
    slotNumber: number;
    user: { telegramId: string };
    player: { name: string };
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

const buildLobbyStatusView = (lobby: MultiplayerLobbyView): MultiplayerLobbyStatusView => ({
  ...lobby,
  canStartMatchPreparation: lobby.status === MultiplayerLobbyStatus.Ready && lobby.participants.length >= 2,
  openSlotCount: Math.max(0, 2 - lobby.participants.length)
});

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
        hostUserId: input.hostUserId,
        createdByPlayerId: input.hostPlayerId,
        participants: {
          create: {
            userId: input.hostUserId,
            playerId: input.hostPlayerId,
            slotNumber: 1,
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
        participants: {
          create: {
            userId: input.userId,
            playerId: input.playerId,
            slotNumber: 2,
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
      createdAt: new Date(lobby.createdAt),
      readyForMatchAt: lobby.readyForMatchAt ? new Date(lobby.readyForMatchAt) : undefined,
      linkedMatchId: lobby.linkedMatchId ?? undefined,
      hostPlayerId: lobby.createdByPlayerId,
      hostPlayerName: lobby.createdByPlayer.name,
      participants: lobby.participants.map((participant) => ({
        userId: participant.userId,
        playerId: participant.playerId,
        playerName: participant.player.name,
        telegramId: participant.user.telegramId,
        isHost: participant.isHost,
        slotNumber: participant.slotNumber,
        joinedAt: new Date(participant.joinedAt)
      }))
    };
  }
}
