import { FrameType, MatchEventType, Prisma, TeamSide, TurnResolutionMode, type PrismaClient } from "@prisma/client";
import type { MatchRepository, PersistTurnInput } from "../../domain/repositories/match-repository.js";
import type { MatchEventView, MatchStateView, SceneCatalogItem } from "../../shared/contracts/match-contracts.js";

const defaultTacticalContext = {
  zone: "MIDDLE_THIRD",
  notes: "Estado inicial em persistência real"
};

const mapEventKeyToPrisma = (key: MatchEventView["key"]): MatchEventType => {
  const table: Record<MatchEventView["key"], MatchEventType> = {
    "pass-received": MatchEventType.PASS_RECEIVED,
    "pass-intercepted": MatchEventType.PASS_INTERCEPTED,
    dribble: MatchEventType.DRIBBLE,
    "defensive-duel": MatchEventType.DEFENSIVE_DUEL,
    shot: MatchEventType.SHOT,
    "goalkeeper-save": MatchEventType.GOALKEEPER_SAVE,
    goal: MatchEventType.GOAL,
    rebound: MatchEventType.REBOUND,
    "corner-kick": MatchEventType.CORNER_KICK,
    "penalty-kick": MatchEventType.PENALTY_KICK,
    "fallback-map": MatchEventType.FALLBACK_MAP
  };

  return table[key];
};

const mapFrameType = (frameType: MatchEventView["visualPayload"]["frameType"]): FrameType => {
  return FrameType[frameType];
};

const sceneCatalog: SceneCatalogItem[] = [
  {
    sceneKey: "fallback-map-default",
    frameType: "TACTICAL_MAP",
    tags: ["fallback", "build-up"],
    zone: "MIDDLE_THIRD",
    side: "BOTH",
    participantsCount: 3,
    assetPath: "/assets/scenes/tactical/fallback-map-default.png",
    fallbackRules: [{ fallbackSceneKey: "fallback-map-default", when: "missing-asset" }]
  },
  {
    sceneKey: "duel-midfield-right",
    frameType: "DUEL_SCENE",
    tags: ["duel", "dribble"],
    zone: "WING_RIGHT",
    side: "BOTH",
    participantsCount: 2,
    assetPath: "/assets/scenes/duel/duel-midfield-right.png",
    fallbackRules: [{ fallbackSceneKey: "fallback-map-default", when: "unsupported-zone" }]
  },
  {
    sceneKey: "shot-box-central",
    frameType: "SHOT_SCENE",
    tags: ["shot", "finishing"],
    zone: "PENALTY_BOX",
    side: "BOTH",
    participantsCount: 2,
    assetPath: "/assets/scenes/shot/shot-box-central.png",
    fallbackRules: [{ fallbackSceneKey: "fallback-map-default", when: "unsupported-side" }]
  }
];

export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMatch(homeTeamName: string, awayTeamName: string, initialState: MatchStateView): Promise<MatchStateView> {
    const result = await this.prisma.$transaction(async (tx) => {
      const homeTeam = await tx.team.create({
        data: {
          name: homeTeamName,
          shortName: homeTeamName.slice(0, 3).toUpperCase()
        }
      });

      const awayTeam = await tx.team.create({
        data: {
          name: awayTeamName,
          shortName: awayTeamName.slice(0, 3).toUpperCase()
        }
      });

      const [homePrimary, awayPrimary] = await Promise.all([
        tx.player.create({
          data: {
            teamId: homeTeam.id,
            name: "Henrique",
            shirtNumber: 8,
            pass: 72,
            dribble: 68,
            finishing: 61,
            marking: 55,
            tackling: 54,
            positioning: 66,
            reflex: 28
          }
        }),
        tx.player.create({
          data: {
            teamId: awayTeam.id,
            name: "Eduardo",
            shirtNumber: 5,
            pass: 63,
            dribble: 58,
            finishing: 45,
            marking: 71,
            tackling: 73,
            positioning: 69,
            reflex: 24
          }
        })
      ]);

      const normalizedInitialEvent: MatchEventView = {
        ...initialState.currentEvent,
        visualPayload: {
          ...initialState.currentEvent.visualPayload,
          participants: initialState.currentEvent.visualPayload.participants.map((participant) => {
            if (participant.side === "HOME" && participant.displayName === "Henrique") {
              return { ...participant, playerId: homePrimary.id };
            }

            if (participant.side === "AWAY" && participant.displayName === "Eduardo") {
              return { ...participant, playerId: awayPrimary.id };
            }

            return participant;
          })
        }
      };

      const match = await tx.match.create({
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: initialState.score.home,
          awayScore: initialState.score.away,
          minute: initialState.minute,
          possessionTeamSide: TeamSide[initialState.possessionTeamSide],
          turnNumber: initialState.turnNumber,
          turnResolutionMode: TurnResolutionMode[initialState.turnResolutionMode],
          tacticalContext: defaultTacticalContext
        }
      });

      const createdEvent = await tx.matchEvent.create({
        data: {
          matchId: match.id,
          teamId: homeTeam.id,
          eventType: mapEventKeyToPrisma(normalizedInitialEvent.key),
          turnNumber: initialState.turnNumber,
          minute: initialState.minute,
          primaryPlayerId: homePrimary.id,
          secondaryPlayerId: awayPrimary.id,
          sceneKey: normalizedInitialEvent.visualPayload.sceneKey,
          frameType: mapFrameType(normalizedInitialEvent.visualPayload.frameType),
          narrativeText: normalizedInitialEvent.narrativeText,
          visualPayload: normalizedInitialEvent.visualPayload,
          success: normalizedInitialEvent.success
        }
      });

      await tx.match.update({
        where: { id: match.id },
        data: { currentEventId: createdEvent.id }
      });

      await tx.matchTurn.create({
        data: {
          matchId: match.id,
          turnNumber: initialState.turnNumber,
          minute: initialState.minute,
          possessionTeamSide: TeamSide[initialState.possessionTeamSide],
          turnResolutionMode: TurnResolutionMode[initialState.turnResolutionMode],
          tacticalContext: defaultTacticalContext,
          eventId: createdEvent.id
        }
      });

      return { matchId: match.id };
    });

    return (await this.getMatchState(result.matchId)) as MatchStateView;
  }

  async getMatchState(matchId: string): Promise<MatchStateView | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        currentEvent: true,
        events: {
          orderBy: [{ turnNumber: "desc" }, { createdAt: "desc" }],
          take: 6
        }
      }
    });

    if (!match || !match.currentEvent) {
      return null;
    }

    const current = this.mapEvent(match.currentEvent);
    const recent = match.events
      .filter((event) => event.id !== match.currentEventId)
      .map((event) => this.mapEvent(event));

    return {
      matchId: match.id,
      minute: match.minute,
      score: { home: match.homeScore, away: match.awayScore },
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      possessionTeamSide: match.possessionTeamSide,
      turnNumber: match.turnNumber,
      turnResolutionMode: match.turnResolutionMode,
      availableActions:
        match.turnResolutionMode === "REQUIRES_PLAYER_ACTION"
          ? ["PASS", "DRIBBLE", "SHOT", "PROTECT_BALL", "PASS_BACK", "SWITCH_PLAY"]
          : [],
      currentEvent: current,
      recentEvents: recent
    };
  }

  async persistTurn(input: PersistTurnInput): Promise<MatchStateView | null> {
    const existing = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      include: { homeTeam: true, awayTeam: true }
    });

    if (!existing) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      const possessionTeamId = input.possessionTeamSide === "HOME" ? existing.homeTeamId : existing.awayTeamId;

      const primaryPlayerId = await this.resolvePersistedPlayerId({
        tx,
        teamId: possessionTeamId,
        fallbackDisplayName: input.event.visualPayload.participants.at(0)?.displayName,
        incomingId: input.event.visualPayload.participants.at(0)?.playerId
      });

      const opposingTeamId = possessionTeamId === existing.homeTeamId ? existing.awayTeamId : existing.homeTeamId;
      const secondaryPlayerId = await this.resolvePersistedPlayerId({
        tx,
        teamId: opposingTeamId,
        fallbackDisplayName: input.event.visualPayload.participants.at(1)?.displayName,
        incomingId: input.event.visualPayload.participants.at(1)?.playerId
      });

      const createdEvent = await tx.matchEvent.create({
        data: {
          matchId: input.matchId,
          eventType: mapEventKeyToPrisma(input.event.key),
          turnNumber: input.turnNumber,
          minute: input.minute,
          teamId: possessionTeamId,
          primaryPlayerId,
          secondaryPlayerId,
          sceneKey: input.event.visualPayload.sceneKey,
          frameType: mapFrameType(input.event.visualPayload.frameType),
          narrativeText: input.event.narrativeText,
          visualPayload: input.event.visualPayload,
          success: input.event.success
        }
      });

      await tx.match.update({
        where: { id: input.matchId },
        data: {
          minute: input.minute,
          turnNumber: input.turnNumber,
          possessionTeamSide: TeamSide[input.possessionTeamSide],
          attackingSide: TeamSide[input.possessionTeamSide],
          defendingSide: TeamSide[input.possessionTeamSide === "HOME" ? "AWAY" : "HOME"],
          turnResolutionMode: TurnResolutionMode[input.turnResolutionMode],
          currentEventId: createdEvent.id
        }
      });

      await tx.matchTurn.upsert({
        where: {
          matchId_turnNumber: {
            matchId: input.matchId,
            turnNumber: input.turnNumber
          }
        },
        update: {
          minute: input.minute,
          possessionTeamSide: TeamSide[input.possessionTeamSide],
          turnResolutionMode: TurnResolutionMode[input.turnResolutionMode],
          tacticalContext: defaultTacticalContext,
          eventId: createdEvent.id
        },
        create: {
          matchId: input.matchId,
          turnNumber: input.turnNumber,
          minute: input.minute,
          possessionTeamSide: TeamSide[input.possessionTeamSide],
          turnResolutionMode: TurnResolutionMode[input.turnResolutionMode],
          tacticalContext: defaultTacticalContext,
          eventId: createdEvent.id
        }
      });
    });

    return this.getMatchState(input.matchId);
  }

  async getSceneCatalog(): Promise<SceneCatalogItem[]> {
    return sceneCatalog;
  }

  private async resolvePersistedPlayerId({
    tx,
    teamId,
    incomingId,
    fallbackDisplayName
  }: {
    tx: Prisma.TransactionClient;
    teamId: string;
    incomingId?: string;
    fallbackDisplayName?: string;
  }): Promise<string | null> {
    if (incomingId) {
      const byId = await tx.player.findFirst({
        where: { id: incomingId, teamId },
        select: { id: true }
      });
      if (byId) {
        return byId.id;
      }
    }

    if (fallbackDisplayName) {
      const byName = await tx.player.findFirst({
        where: { name: fallbackDisplayName, teamId },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      });
      return byName?.id ?? null;
    }

    return null;
  }

  private mapEvent(event: {
    id: string;
    eventType: MatchEventType;
    minute: number;
    narrativeText: string;
    success: boolean | null;
    visualPayload: unknown;
  }): MatchEventView {
    return {
      id: event.id,
      key: this.mapEventTypeToKey(event.eventType),
      label: this.mapEventTypeToLabel(event.eventType),
      minute: event.minute,
      narrativeText: event.narrativeText,
      success: event.success ?? undefined,
      visualPayload: event.visualPayload as MatchEventView["visualPayload"]
    };
  }

  private mapEventTypeToKey(eventType: MatchEventType): MatchEventView["key"] {
    const table: Record<MatchEventType, MatchEventView["key"]> = {
      PASS_RECEIVED: "pass-received",
      PASS_INTERCEPTED: "pass-intercepted",
      DRIBBLE: "dribble",
      DEFENSIVE_DUEL: "defensive-duel",
      SHOT: "shot",
      GOALKEEPER_SAVE: "goalkeeper-save",
      GOAL: "goal",
      REBOUND: "rebound",
      CORNER_KICK: "corner-kick",
      PENALTY_KICK: "penalty-kick",
      FALLBACK_MAP: "fallback-map"
    };

    return table[eventType];
  }

  private mapEventTypeToLabel(eventType: MatchEventType): string {
    const table: Record<MatchEventType, string> = {
      PASS_RECEIVED: "Passe Recebido",
      PASS_INTERCEPTED: "Passe Interceptado",
      DRIBBLE: "Drible",
      DEFENSIVE_DUEL: "Duelo Defensivo",
      SHOT: "Finalização",
      GOALKEEPER_SAVE: "Defesa do goleiro",
      GOAL: "Gol",
      REBOUND: "Rebote",
      CORNER_KICK: "Escanteio",
      PENALTY_KICK: "Pênalti",
      FALLBACK_MAP: "Mapa Tático"
    };

    return table[eventType];
  }
}
