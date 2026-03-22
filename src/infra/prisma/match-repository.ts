import { CareerStatus } from '../../domain/shared/enums';
import { getPrismaClient } from './client';
import { CreateMatchTurnInput, MatchPlayerProfile, MatchRepository, MatchResolutionInput } from '../../domain/match/repository';
import { getTacticalPositionForSideAndShirt } from '../../domain/match/lineup-factory';
import {
  MatchActionChoice,
  MatchLineupPlayer,
  MatchSummary,
  MatchTurnView,
  MatchEventView,
  MatchStatus,
  MatchRole,
  MatchTurnState,
  MatchVisualEvent,
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
  lineups: Array<{ id: string; side: MatchLineupPlayer['side']; displayName: string; shirtNumber: number | null; isUserControlled: boolean; role: MatchRole }>;
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
    events: Array<{ metadata: unknown | null }>;
  }>;
  events: Array<{ type: MatchEventView['type']; minute: number; description: string; createdAt: Date }>;
  injuries: Array<{ description: string; severity: number; matchesRemaining: number; isActive: boolean; createdAt: Date }>;
  suspensions: Array<{ matchesRemaining: number; isActive: boolean }>;
}

const ensureCpuClub = async (name: string, city: string) => {
  const prisma = getPrismaClient();
  return prisma.club.upsert({ where: { name }, update: { city, country: 'Brasil', division: 'Série Profissional', reputation: 62 }, create: { name, city, country: 'Brasil', division: 'Série Profissional', reputation: 62 } });
};

const matchInclude = (pendingOnly: boolean) => ({
  homeClub: true,
  awayClub: true,
  lineups: { orderBy: [{ side: 'asc' }, { shirtNumber: 'asc' }] },
  turns: pendingOnly
    ? { where: { state: MatchTurnState.Pending }, orderBy: { sequence: 'desc' }, take: 1, include: { events: { where: { type: 'TURN_STARTED' }, orderBy: { createdAt: 'desc' }, take: 1 } } }
    : { orderBy: { sequence: 'desc' }, take: 1, include: { events: { where: { type: 'TURN_STARTED' }, orderBy: { createdAt: 'desc' }, take: 1 } } },
  events: { orderBy: { createdAt: 'desc' }, take: 8 },
  injuries: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
  suspensions: { where: { isActive: true }, orderBy: { createdAt: 'desc' } }
});

const asVisualEvent = (value: unknown): MatchVisualEvent | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { visualEvent?: MatchVisualEvent };
  return record.visualEvent;
};

const logAudit = (event: string, details: Record<string, unknown>): void => {
  console.info('[prisma-match-repository]', JSON.stringify({ event, ...details }));
};

export class PrismaMatchRepository implements MatchRepository {
  async findPlayerByTelegramId(telegramId: string): Promise<MatchPlayerProfile | null> {
    const prisma = getPrismaClient();
    const player = (await prisma.player.findFirst({ where: { generation: { isCurrent: true, user: { telegramId } } }, include: { currentClub: true, attributes: true, generation: { include: { user: true } } } })) as PlayerRecord | null;
    if (!player) return null;
    return { playerId: player.id, telegramId: player.generation.user.telegramId, playerName: player.name, clubId: player.currentClubId ?? undefined, clubName: player.currentClub?.name ?? undefined, position: player.position, careerStatus: player.careerStatus, attributes: Object.fromEntries(player.attributes.map((attribute) => [attribute.key, attribute.value])) };
  }

  async getActiveMatchByTelegramId(telegramId: string): Promise<MatchSummary | null> {
    const prisma = getPrismaClient();
    const match = (await prisma.match.findFirst({ where: { status: MatchStatus.InProgress, player: { generation: { isCurrent: true, user: { telegramId } } } }, orderBy: { createdAt: 'desc' }, include: matchInclude(true) })) as MatchRecord | null;
    return match ? this.toSummary(match) : null;
  }

  async getLatestMatchByTelegramId(telegramId: string): Promise<MatchSummary | null> {
    const prisma = getPrismaClient();
    const match = (await prisma.match.findFirst({ where: { player: { generation: { isCurrent: true, user: { telegramId } } } }, orderBy: { createdAt: 'desc' }, include: matchInclude(false) })) as MatchRecord | null;
    return match ? this.toSummary(match) : null;
  }

  async createMatchForPlayer(params: { telegramId: string; homeClubId: string; homeClubName: string; awayClubName: string; playerId: string; userRole: MatchRole; lineups: MatchLineupPlayer[]; initialTurn: CreateMatchTurnInput; }): Promise<MatchSummary> {
    const prisma = getPrismaClient();
    const homeClub = (await prisma.club.findUnique({ where: { id: params.homeClubId } })) as { id: string; name: string } | null;
    if (!homeClub) throw new Error('Clube do jogador não encontrado para iniciar a partida.');
    const awayClub = (await ensureCpuClub(params.awayClubName, params.awayClubName)) as { id: string; name: string };

    logAudit('create-match-request', {
      telegramId: params.telegramId,
      playerId: params.playerId,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      relationConnectEnabled: true
    });

    const match = (await prisma.match.create({
      data: {
        player: { connect: { id: params.playerId } },
        homeClub: { connect: { id: homeClub.id } },
        awayClub: { connect: { id: awayClub.id } },
        currentMinute: params.initialTurn.minute,
        currentHalf: params.initialTurn.half,
        possessionSide: params.initialTurn.possessionSide,
        status: MatchStatus.InProgress,
        lineups: {
          create: params.lineups.map((lineup) => ({
            ...(lineup.isUserControlled ? { player: { connect: { id: params.playerId } } } : {}),
            side: lineup.side,
            role: lineup.role === 'GOALKEEPER' ? MatchRole.Goalkeeper : lineup.isUserControlled ? params.userRole : MatchRole.CpuSupport,
            displayName: lineup.displayName,
            shirtNumber: lineup.shirtNumber,
            isUserControlled: lineup.isUserControlled
          }))
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
            isGoalkeeperContext: params.initialTurn.isGoalkeeperContext,
            events: { create: { type: 'TURN_STARTED', minute: params.initialTurn.minute, description: 'Partida iniciada e primeiro lance liberado.', metadata: { sequence: params.initialTurn.sequence, visualEvent: params.initialTurn.visualEvent } } }
          }
        }
      },
      include: matchInclude(true)
    })) as MatchRecord;

    logAudit('create-match-created', {
      matchId: match.id,
      playerId: match.playerId,
      activeTurnId: match.turns[0]?.id ?? null,
      relationConnectEnabled: true
    });

    return this.toSummary(match);
  }

  async resolveTurn(matchId: string, resolution: MatchResolutionInput): Promise<ResolveTurnResult> {
    const prisma = getPrismaClient();
    const match = (await prisma.$transaction(async (tx) => {
      const currentMatch = (await tx.match.findUnique({ where: { id: matchId } })) as { playerId: string } | null;
      if (!currentMatch) throw new Error('Partida não encontrada.');

      await tx.matchTurn.update({ where: { id: resolution.turnId }, data: { chosenAction: resolution.action, state: resolution.turnState, resolvedAt: new Date(), resolutionText: resolution.outcomeText } });
      await tx.match.update({ where: { id: matchId }, data: { homeScore: resolution.homeScore, awayScore: resolution.awayScore, currentMinute: resolution.minute, currentHalf: resolution.half, possessionSide: resolution.possessionSide, status: resolution.status, userEnergy: resolution.energy, stoppageMinutes: resolution.stoppageMinutes, yellowCards: { increment: resolution.yellowCardsDelta ?? 0 }, redCards: { increment: resolution.redCardIssued ? 1 : 0 } } });

      for (const event of resolution.events) {
        logAudit('match-event-create-request', {
          matchId,
          turnId: resolution.turnId,
          type: event.type,
          relationConnectEnabled: true
        });

        await tx.matchEvent.create({
          data: {
            match: { connect: { id: matchId } },
            turn: { connect: { id: resolution.turnId } },
            type: event.type,
            minute: event.minute,
            description: event.description,
            metadata: event.metadata
          }
        });
        if (event.type === 'YELLOW_CARD' || event.type === 'RED_CARD' || event.type === 'SUSPENSION') {
          await tx.matchDisciplinaryEvent.create({
            data: {
              match: { connect: { id: matchId } },
              player: { connect: { id: currentMatch.playerId } },
              type: event.type,
              minute: event.minute,
              description: event.description,
              suspensionMatches: event.type === 'SUSPENSION' ? resolution.suspensionMatchesToAdd ?? 0 : 0
            }
          });
        }
      }

      if (resolution.injury) {
        await tx.injuryRecord.updateMany({ where: { playerId: currentMatch.playerId, isActive: true }, data: { isActive: false } });
        await tx.injuryRecord.create({
          data: {
            player: { connect: { id: currentMatch.playerId } },
            match: { connect: { id: matchId } },
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
            player: { connect: { id: currentMatch.playerId } },
            match: { connect: { id: matchId } },
            reason: resolution.redCardIssued ? 'Cartão vermelho na partida.' : 'Acúmulo disciplinar na partida.',
            sourceEventType: resolution.redCardIssued ? 'RED_CARD' : 'SUSPENSION',
            matchesRemaining: resolution.suspensionMatchesToAdd ?? 0,
            isActive: true
          }
        });
      }

      if (resolution.nextTurn) {
        logAudit('next-turn-create-request', {
          matchId,
          turnId: resolution.turnId,
          nextSequence: resolution.nextTurn.sequence,
          relationConnectEnabled: true,
          relationConnect: {
            match: { connect: { id: matchId } }
          }
        });

        await tx.matchTurn.create({
          data: {
            match: { connect: { id: matchId } },
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
            isGoalkeeperContext: resolution.nextTurn.isGoalkeeperContext,
            events: { create: { type: 'TURN_STARTED', minute: resolution.nextTurn.minute, description: 'Novo lance liberado.', metadata: { sequence: resolution.nextTurn.sequence, visualEvent: resolution.nextTurn.visualEvent } } }
          }
        });

        logAudit('next-turn-create-created', {
          matchId,
          previousTurnId: resolution.turnId,
          nextSequence: resolution.nextTurn.sequence,
          relationConnectEnabled: true
        });
      }

      return tx.match.findUnique({ where: { id: matchId }, include: matchInclude(true) });
    })) as MatchRecord;

    return { match: this.toSummary(match), resolutionText: resolution.outcomeText };
  }

  async consumePendingSuspension(playerId: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const suspension = (await prisma.suspensionRecord.findFirst({ where: { playerId, isActive: true, matchesRemaining: { gt: 0 } }, orderBy: { createdAt: 'asc' } })) as { id: string; matchesRemaining: number } | null;
    if (!suspension) return false;
    const nextRemaining = suspension.matchesRemaining - 1;
    await prisma.suspensionRecord.update({ where: { id: suspension.id }, data: { matchesRemaining: nextRemaining, isActive: nextRemaining > 0 } });
    return true;
  }

  private toSummary(match: MatchRecord): MatchSummary {
    const latestTurnRecord = match.turns[0];
    const activeTurnRecord = latestTurnRecord?.state === MatchTurnState.Pending ? latestTurnRecord : undefined;
    const lineups = match.lineups.map((lineup) => {
      return { id: lineup.id, side: lineup.side, role: lineup.role === 'GOALKEEPER' ? 'GOALKEEPER' : (lineup.shirtNumber ?? 0) === 10 || (lineup.shirtNumber ?? 0) === 11 ? 'FORWARD' : (lineup.shirtNumber ?? 0) >= 6 && (lineup.shirtNumber ?? 0) <= 9 ? 'MIDFIELDER' : 'DEFENDER', displayName: lineup.displayName, shirtNumber: lineup.shirtNumber ?? 0, isUserControlled: lineup.isUserControlled, tacticalPosition: getTacticalPositionForSideAndShirt(lineup.side, lineup.shirtNumber ?? 1) } as MatchLineupPlayer;
    });

    return {
      id: match.id,
      playerId: match.playerId,
      status: match.status,
      scoreboard: { homeClubName: match.homeClub.name, awayClubName: match.awayClub.name, homeScore: match.homeScore, awayScore: match.awayScore, minute: activeTurnRecord?.minute ?? match.currentMinute, half: activeTurnRecord?.half ?? match.currentHalf, status: match.status, stoppageMinutes: match.stoppageMinutes },
      activeTurn: activeTurnRecord ? { id: activeTurnRecord.id, matchId: match.id, sequence: activeTurnRecord.sequence, minute: activeTurnRecord.minute, half: activeTurnRecord.half, possessionSide: activeTurnRecord.possessionSide, contextType: activeTurnRecord.contextType, contextText: activeTurnRecord.contextText, availableActions: activeTurnRecord.availableActions.map((key) => this.toActionChoice(key)), deadlineAt: new Date(activeTurnRecord.deadlineAt), state: activeTurnRecord.state, isGoalkeeperContext: activeTurnRecord.isGoalkeeperContext, previousOutcome: activeTurnRecord.previousOutcome ?? undefined, visualEvent: asVisualEvent(activeTurnRecord.events[0]?.metadata) } : undefined,
      recentEvents: match.events.map((event) => ({ type: event.type, minute: event.minute, description: event.description, createdAt: new Date(event.createdAt) })),
      yellowCards: match.yellowCards,
      redCards: match.redCards,
      suspensionMatchesRemaining: match.suspensions.reduce((sum, item) => sum + (item.isActive ? item.matchesRemaining : 0), 0),
      energy: match.userEnergy,
      injury: match.injuries[0] ? { severity: match.injuries[0].severity, matchesRemaining: match.injuries[0].matchesRemaining, description: match.injuries[0].description } : undefined,
      lineups
    };
  }

  private toActionChoice(key: MatchActionChoice['key']): MatchActionChoice {
    const labels: Record<string, string> = { PASS: 'Passar', DRIBBLE: 'Driblar', SHOOT: 'Finalizar', CONTROL: 'Dominar', PROTECT: 'Proteger bola', TACKLE: 'Dar bote', CLEAR: 'Afastar', SAVE: 'Defender', PUNCH: 'Espalmar', CATCH: 'Segurar', RUSH_OUT: 'Sair do gol', REBOUND: 'Rebater', DISTRIBUTE_HAND: 'Reposição com a mão', DISTRIBUTE_FOOT: 'Reposição com o pé', AIM_LOW_LEFT: 'Baixo esquerdo', AIM_LOW_RIGHT: 'Baixo direito', AIM_HIGH_LEFT: 'Alto esquerdo', AIM_HIGH_RIGHT: 'Alto direito' };
    return { key, label: labels[key] ?? key };
  }
}
