import { CareerStatus } from '../../domain/shared/enums';
import { getPrismaClient } from './client';
import { CreateMatchTurnInput, MatchPlayerProfile, MatchRepository, MatchResolutionInput } from '../../domain/match/repository';
import {
  MatchActionChoice,
  MatchSummary,
  MatchTurnView,
  MatchEventView,
  MatchStatus,
  MatchRole,
  MatchTurnState,
  ResolveTurnResult
} from '../../domain/match/types';

interface PlayerRecord {
  id: string;
  name: string;
  position: string;
  careerStatus: CareerStatus;
  currentClubId: string | null;
  currentClub: { name: string } | null;
  attributes: Array<{ key: string; value: number }>;
  generation: { user: { telegramId: string } };
}

interface MatchRecord {
  id: string;
  playerId: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  currentHalf: MatchSummary['scoreboard']['half'];
  possessionSide: MatchTurnView['possessionSide'];
  stoppageMinutes: number;
  userEnergy: number;
  yellowCards: number;
  redCards: number;
  homeClub: { name: string };
  awayClub: { name: string };
  turns: Array<{
    id: string;
    sequence: number;
    minute: number;
    half: MatchTurnView['half'];
    possessionSide: MatchTurnView['possessionSide'];
    contextType: MatchTurnView['contextType'];
    contextText: string;
    availableActions: MatchTurnView['availableActions'][number]['key'][];
    deadlineAt: Date;
    state: MatchTurnState;
    isGoalkeeperContext: boolean;
    previousOutcome: string | null;
  }>;
  events: Array<{ type: MatchEventView['type']; minute: number; description: string; createdAt: Date }>;
  injuries: Array<{ description: string; severity: number; matchesRemaining: number; isActive: boolean; createdAt: Date }>;
  disciplinary: Array<{ type: MatchEventView['type']; suspensionMatches: number }>;
}

const ensureCpuClub = async (name: string, city: string) => {
  const prisma = getPrismaClient();
  return prisma.club.upsert({
    where: { name },
    update: { city, country: 'Brasil', division: 'Série Profissional', reputation: 62 },
    create: { name, city, country: 'Brasil', division: 'Série Profissional', reputation: 62 }
  });
};

export class PrismaMatchRepository implements MatchRepository {
  async findPlayerByTelegramId(telegramId: string): Promise<MatchPlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({
      where: { generation: { isCurrent: true, user: { telegramId } } },
      include: { currentClub: true, attributes: true, generation: { include: { user: true } } }
    })) as PlayerRecord | null;

    if (!player) {
      return null;
    }

    return {
      playerId: player.id,
      telegramId: player.generation.user.telegramId,
      playerName: player.name,
      clubId: player.currentClubId ?? undefined,
      clubName: player.currentClub?.name ?? undefined,
      position: player.position,
      careerStatus: player.careerStatus,
      attributes: Object.fromEntries(player.attributes.map((attribute) => [attribute.key, attribute.value]))
    };
  }

  async getActiveMatchByTelegramId(telegramId: string): Promise<MatchSummary | null> {
    const prisma = getPrismaClient();
    const match = (await prisma.match.findFirst({
      where: { status: MatchStatus.InProgress, player: { generation: { isCurrent: true, user: { telegramId } } } },
      orderBy: { createdAt: 'desc' },
      include: {
        homeClub: true,
        awayClub: true,
        turns: { orderBy: { sequence: 'desc' }, take: 1 },
        events: { orderBy: { createdAt: 'desc' }, take: 8 },
        injuries: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinary: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    })) as MatchRecord | null;

    return match ? this.toSummary(match) : null;
  }

  async createMatchForPlayer(params: {
    telegramId: string;
    homeClubId: string;
    homeClubName: string;
    awayClubId: string;
    awayClubName: string;
    playerId: string;
    userRole: MatchRole;
    initialTurn: CreateMatchTurnInput;
  }): Promise<MatchSummary> {
    const prisma = getPrismaClient();

    const homeClub = (await prisma.club.findUnique({ where: { id: params.homeClubId } })) as { id: string; name: string } | null;
    if (!homeClub) {
      throw new Error('Clube do jogador não encontrado para iniciar a partida.');
    }
    const awayClub = (await ensureCpuClub(params.awayClubName, params.awayClubName)) as { id: string; name: string };

    const match = (await prisma.match.create({
      data: {
        playerId: params.playerId,
        homeClubId: homeClub.id,
        awayClubId: awayClub.id,
        currentMinute: params.initialTurn.minute,
        currentHalf: params.initialTurn.half,
        possessionSide: params.initialTurn.possessionSide,
        status: MatchStatus.InProgress,
        lineups: {
          create: [
            {
              playerId: params.playerId,
              side: 'HOME',
              role: params.userRole,
              displayName: 'Você',
              shirtNumber: 10,
              isUserControlled: true
            },
            {
              side: 'AWAY',
              role: MatchRole.CpuSupport,
              displayName: awayClub.name,
              shirtNumber: 9,
              isUserControlled: false
            }
          ]
        },
        turns: {
          create: {
            sequence: params.initialTurn.sequence,
            minute: params.initialTurn.minute,
            half: params.initialTurn.half,
            possessionSide: params.initialTurn.possessionSide,
            contextType: params.initialTurn.contextType,
            contextText: params.initialTurn.contextText,
            availableActions: params.initialTurn.availableActions,
            deadlineAt: params.initialTurn.deadlineAt,
            state: MatchTurnState.Pending,
            previousOutcome: params.initialTurn.previousOutcome,
            isGoalkeeperContext: params.initialTurn.isGoalkeeperContext
          }
        },
        events: {
          create: {
            type: 'TURN_STARTED',
            minute: params.initialTurn.minute,
            description: 'Partida iniciada e primeiro lance liberado.',
            metadata: { sequence: params.initialTurn.sequence }
          }
        }
      },
      include: {
        homeClub: true,
        awayClub: true,
        turns: { orderBy: { sequence: 'desc' }, take: 1 },
        events: { orderBy: { createdAt: 'desc' }, take: 8 },
        injuries: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        disciplinary: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    })) as MatchRecord;

    return this.toSummary(match);
  }

  async resolveTurn(matchId: string, resolution: MatchResolutionInput): Promise<ResolveTurnResult> {
    const prisma = getPrismaClient();
    const match = (await prisma.$transaction(async (tx) => {
      const currentMatch = (await tx.match.findUnique({ where: { id: matchId }, include: { player: true } })) as { playerId: string } | null;
      if (!currentMatch) {
        throw new Error('Partida não encontrada.');
      }

      await tx.matchTurn.update({
        where: { id: resolution.turnId },
        data: {
          chosenAction: resolution.action,
          state: resolution.turnState,
          resolvedAt: new Date(),
          resolutionText: resolution.outcomeText
        }
      });

      await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore: resolution.homeScore,
          awayScore: resolution.awayScore,
          currentMinute: resolution.minute,
          currentHalf: resolution.half,
          possessionSide: resolution.possessionSide,
          status: resolution.status,
          userEnergy: resolution.energy,
          stoppageMinutes: resolution.stoppageMinutes,
          yellowCards: { increment: resolution.yellowCardsDelta ?? 0 },
          redCards: { increment: resolution.redCardIssued ? 1 : 0 }
        }
      });

      for (const event of resolution.events) {
        await tx.matchEvent.create({
          data: {
            matchId,
            turnId: resolution.turnId,
            type: event.type,
            minute: event.minute,
            description: event.description,
            metadata: event.metadata
          }
        });

        if (event.type === 'YELLOW_CARD' || event.type === 'RED_CARD' || event.type === 'SUSPENSION') {
          await tx.matchDisciplinaryEvent.create({
            data: {
              matchId,
              playerId: currentMatch.playerId,
              type: event.type,
              minute: event.minute,
              description: event.description,
              suspensionMatches: resolution.suspensionMatchesToAdd ?? 0
            }
          });
        }
      }

      if (resolution.injury) {
        await tx.injuryRecord.updateMany({
          where: { playerId: currentMatch.playerId, isActive: true },
          data: { isActive: false }
        });
        await tx.injuryRecord.create({
          data: {
            playerId: currentMatch.playerId,
            matchId,
            description: resolution.injury.description,
            severity: resolution.injury.severity,
            matchesRemaining: resolution.injury.matchesRemaining,
            isActive: true
          }
        });
      }

      if ((resolution.suspensionMatchesToAdd ?? 0) > 0) {
        await tx.suspensionRecord.create({
          data: {
            playerId: currentMatch.playerId,
            matchId,
            reason: resolution.redCardIssued ? 'Cartão vermelho na partida.' : 'Acúmulo disciplinar na partida.',
            sourceEventType: resolution.redCardIssued ? 'RED_CARD' : 'SUSPENSION',
            matchesRemaining: resolution.suspensionMatchesToAdd ?? 0,
            isActive: true
          }
        });
      }

      if (resolution.nextTurn) {
        await tx.matchTurn.create({
          data: {
            matchId,
            sequence: resolution.nextTurn.sequence,
            minute: resolution.nextTurn.minute,
            half: resolution.nextTurn.half,
            possessionSide: resolution.nextTurn.possessionSide,
            contextType: resolution.nextTurn.contextType,
            contextText: resolution.nextTurn.contextText,
            availableActions: resolution.nextTurn.availableActions,
            deadlineAt: resolution.nextTurn.deadlineAt,
            state: MatchTurnState.Pending,
            previousOutcome: resolution.nextTurn.previousOutcome,
            isGoalkeeperContext: resolution.nextTurn.isGoalkeeperContext
          }
        });
      }

      return tx.match.findUnique({
        where: { id: matchId },
        include: {
          homeClub: true,
          awayClub: true,
          turns: { where: { state: MatchTurnState.Pending }, orderBy: { sequence: 'desc' }, take: 1 },
          events: { orderBy: { createdAt: 'desc' }, take: 8 },
          injuries: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          disciplinary: { orderBy: { createdAt: 'desc' }, take: 5 }
        }
      });
    })) as MatchRecord;

    return {
      match: this.toSummary(match),
      resolutionText: resolution.outcomeText
    };
  }

  async consumePendingSuspension(playerId: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const suspension = (await prisma.suspensionRecord.findFirst({ where: { playerId, isActive: true, matchesRemaining: { gt: 0 } }, orderBy: { createdAt: 'asc' } })) as { id: string; matchesRemaining: number } | null;
    if (!suspension) {
      return false;
    }

    const nextRemaining = suspension.matchesRemaining - 1;
    await prisma.suspensionRecord.update({
      where: { id: suspension.id },
      data: { matchesRemaining: nextRemaining, isActive: nextRemaining > 0 }
    });
    return true;
  }

  private toSummary(match: MatchRecord): MatchSummary {
    const activeTurnRecord = match.turns[0];
    return {
      id: match.id,
      playerId: match.playerId,
      status: match.status,
      scoreboard: {
        homeClubName: match.homeClub.name,
        awayClubName: match.awayClub.name,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        minute: match.currentMinute,
        half: match.currentHalf,
        status: match.status,
        stoppageMinutes: match.stoppageMinutes
      },
      activeTurn: activeTurnRecord
        ? {
            id: activeTurnRecord.id,
            matchId: match.id,
            sequence: activeTurnRecord.sequence,
            minute: activeTurnRecord.minute,
            half: activeTurnRecord.half,
            possessionSide: activeTurnRecord.possessionSide,
            contextType: activeTurnRecord.contextType,
            contextText: activeTurnRecord.contextText,
            availableActions: activeTurnRecord.availableActions.map((key) => this.toActionChoice(key)),
            deadlineAt: new Date(activeTurnRecord.deadlineAt),
            state: activeTurnRecord.state,
            isGoalkeeperContext: activeTurnRecord.isGoalkeeperContext,
            previousOutcome: activeTurnRecord.previousOutcome ?? undefined
          }
        : undefined,
      recentEvents: match.events.map((event) => ({
        type: event.type,
        minute: event.minute,
        description: event.description,
        createdAt: new Date(event.createdAt)
      })),
      yellowCards: match.yellowCards,
      redCards: match.redCards,
      suspensionMatchesRemaining: match.disciplinary.reduce((sum, item) => sum + (item.suspensionMatches ?? 0), 0),
      energy: match.userEnergy,
      injury: match.injuries[0]
        ? {
            severity: match.injuries[0].severity,
            matchesRemaining: match.injuries[0].matchesRemaining,
            description: match.injuries[0].description
          }
        : undefined
    };
  }

  private toActionChoice(key: MatchActionChoice['key']): MatchActionChoice {
    const labels: Record<string, string> = {
      PASS: 'Passar',
      DRIBBLE: 'Driblar',
      SHOOT: 'Finalizar',
      CONTROL: 'Dominar',
      PROTECT: 'Proteger bola',
      TACKLE: 'Dar bote',
      CLEAR: 'Afastar',
      SAVE: 'Defender',
      PUNCH: 'Espalmar',
      CATCH: 'Segurar',
      RUSH_OUT: 'Sair do gol',
      REBOUND: 'Rebater',
      DISTRIBUTE_HAND: 'Reposição com a mão',
      DISTRIBUTE_FOOT: 'Reposição com o pé',
      AIM_LOW_LEFT: 'Baixo esquerdo',
      AIM_LOW_RIGHT: 'Baixo direito',
      AIM_HIGH_LEFT: 'Alto esquerdo',
      AIM_HIGH_RIGHT: 'Alto direito'
    };

    return { key, label: labels[key] ?? key };
  }
}
