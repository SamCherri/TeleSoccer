import {
  FrameType,
  MatchEventType,
  Prisma,
  TeamSide,
  TurnResolutionMode,
  type PrismaClient
} from "@prisma/client";
import type { MatchRepository, PersistTurnInput } from "../../domain/repositories/match-repository.js";
import type {
  MatchEventKey,
  MatchEventView,
  MatchStateView,
  SceneCatalogItem,
  VisualPayload,
  VisualParticipant
} from "../../shared/contracts/match-contracts.js";

const defaultTacticalContext = {
  zone: "MIDDLE_THIRD",
  notes: "Estado inicial em persistência real"
};

const mapEventKeyToPrisma = (key: MatchEventKey): MatchEventType => {
  switch (key) {
    case "pass-received":
      return MatchEventType.PASS_RECEIVED;
    case "pass-intercepted":
      return MatchEventType.PASS_INTERCEPTED;
    case "dribble":
      return MatchEventType.DRIBBLE;
    case "defensive-duel":
      return MatchEventType.DEFENSIVE_DUEL;
    case "shot":
      return MatchEventType.SHOT;
    case "goalkeeper-save":
      return MatchEventType.GOALKEEPER_SAVE;
    case "goal":
      return MatchEventType.GOAL;
    case "rebound":
      return MatchEventType.REBOUND;
    case "corner-kick":
      return MatchEventType.CORNER_KICK;
    case "penalty-kick":
      return MatchEventType.PENALTY_KICK;
    case "fallback-map":
      return MatchEventType.FALLBACK_MAP;
  }
};

const mapFrameType = (frameType: MatchEventView["visualPayload"]["frameType"]): FrameType => {
  switch (frameType) {
    case "TACTICAL_MAP":
      return FrameType.TACTICAL_MAP;
    case "DUEL_SCENE":
      return FrameType.DUEL_SCENE;
    case "SHOT_SCENE":
      return FrameType.SHOT_SCENE;
    case "SAVE_SCENE":
      return FrameType.SAVE_SCENE;
    case "GOAL_SCENE":
      return FrameType.GOAL_SCENE;
  }
};

const toPrismaVisualPayload = (payload: VisualPayload): Prisma.InputJsonObject => ({
  renderer: payload.renderer,
  frameType: payload.frameType,
  sceneKey: payload.sceneKey,
  zone: payload.zone,
  attackingSide: payload.attackingSide,
  ball: {
    x: payload.ball.x,
    y: payload.ball.y,
    possessionTeamSide: payload.ball.possessionTeamSide
  },
  participants: payload.participants.map((participant) => ({
    playerId: participant.playerId,
    displayName: participant.displayName,
    side: participant.side,
    role: participant.role,
    relativeX: participant.relativeX,
    relativeY: participant.relativeY,
    hasBall: participant.hasBall
  })),
  assetPath: payload.assetPath,
  metadata: {
    camera: payload.metadata.camera,
    intensity: payload.metadata.intensity,
    tags: [...payload.metadata.tags]
  }
});

const isObject = (value: Prisma.JsonValue): value is Record<string, Prisma.JsonValue> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readString = (value: Prisma.JsonValue, field: string): string => {
  if (typeof value !== "string") {
    throw new Error(`Campo visualPayload.${field} inválido`);
  }
  return value;
};

const readNumber = (value: Prisma.JsonValue, field: string): number => {
  if (typeof value !== "number") {
    throw new Error(`Campo visualPayload.${field} inválido`);
  }
  return value;
};

const readBoolean = (value: Prisma.JsonValue, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`Campo visualPayload.${field} inválido`);
  }
  return value;
};

const readEnum = <T extends string>(value: Prisma.JsonValue, field: string, allowed: readonly T[]): T => {
  const parsed = readString(value, field);
  if (!allowed.includes(parsed as T)) {
    throw new Error(`Campo visualPayload.${field} inválido`);
  }
  return parsed as T;
};

const toVisualPayload = (value: Prisma.JsonValue): VisualPayload => {
  if (!isObject(value)) {
    throw new Error("Campo visualPayload inválido");
  }

  const ballValue = value.ball;
  const metadataValue = value.metadata;
  const participantsValue = value.participants;

  if (!isObject(ballValue) || !isObject(metadataValue) || !Array.isArray(participantsValue)) {
    throw new Error("Estrutura de visualPayload inválida");
  }

  const tagsValue = metadataValue.tags;
  if (!Array.isArray(tagsValue) || !tagsValue.every((tag) => typeof tag === "string")) {
    throw new Error("Campo visualPayload.metadata.tags inválido");
  }

  const participants = participantsValue.map((participant, index) => {
    if (!isObject(participant)) {
      throw new Error(`Campo visualPayload.participants[${index}] inválido`);
    }

    return {
      playerId: readString(participant.playerId, `participants[${index}].playerId`),
      displayName: readString(participant.displayName, `participants[${index}].displayName`),
      side: readEnum(participant.side, `participants[${index}].side`, ["HOME", "AWAY"]),
      role: readEnum(participant.role, `participants[${index}].role`, ["PRIMARY", "SECONDARY", "GOALKEEPER", "SUPPORT"]),
      relativeX: readNumber(participant.relativeX, `participants[${index}].relativeX`),
      relativeY: readNumber(participant.relativeY, `participants[${index}].relativeY`),
      hasBall: readBoolean(participant.hasBall, `participants[${index}].hasBall`)
    };
  });

  return {
    renderer: readEnum(value.renderer, "renderer", ["asset", "composed"]),
    frameType: readEnum(value.frameType, "frameType", [
      "TACTICAL_MAP",
      "DUEL_SCENE",
      "SHOT_SCENE",
      "SAVE_SCENE",
      "GOAL_SCENE"
    ]),
    sceneKey: readString(value.sceneKey, "sceneKey"),
    zone: readEnum(value.zone, "zone", [
      "DEFENSIVE_THIRD",
      "MIDDLE_THIRD",
      "ATTACKING_THIRD",
      "PENALTY_BOX",
      "WING_LEFT",
      "WING_RIGHT",
      "CENTER_CHANNEL"
    ]),
    attackingSide: readEnum(value.attackingSide, "attackingSide", ["HOME", "AWAY"]),
    ball: {
      x: readNumber(ballValue.x, "ball.x"),
      y: readNumber(ballValue.y, "ball.y"),
      possessionTeamSide: readEnum(ballValue.possessionTeamSide, "ball.possessionTeamSide", ["HOME", "AWAY"])
    },
    participants,
    assetPath: readString(value.assetPath, "assetPath"),
    metadata: {
      camera: readEnum(metadataValue.camera, "metadata.camera", ["top", "close"]),
      intensity: readEnum(metadataValue.intensity, "metadata.intensity", ["low", "medium", "high"]),
      tags: tagsValue
    }
  };
};

const buildMatchEventCreateData = ({
  matchId,
  teamId,
  event,
  turnNumber,
  minute,
  primaryPlayerId,
  secondaryPlayerId
}: {
  matchId: string;
  teamId: string;
  event: MatchEventView;
  turnNumber: number;
  minute: number;
  primaryPlayerId: string | null;
  secondaryPlayerId: string | null;
}): Prisma.MatchEventUncheckedCreateInput => ({
  matchId,
  teamId,
  eventType: mapEventKeyToPrisma(event.key),
  turnNumber,
  minute,
  primaryPlayerId,
  secondaryPlayerId,
  sceneKey: event.visualPayload.sceneKey,
  frameType: mapFrameType(event.visualPayload.frameType),
  narrativeText: event.narrativeText,
  visualPayload: toPrismaVisualPayload(event.visualPayload),
  ...(event.success !== undefined ? { success: event.success } : {})
});

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
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          participants: initialState.currentEvent.visualPayload.participants.map((participant: VisualParticipant) => {
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
        data: buildMatchEventCreateData({
          matchId: match.id,
          teamId: homeTeam.id,
          event: normalizedInitialEvent,
          turnNumber: initialState.turnNumber,
          minute: initialState.minute,
          primaryPlayerId: homePrimary.id,
          secondaryPlayerId: awayPrimary.id
        })
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

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const possessionTeamId = input.possessionTeamSide === "HOME" ? existing.homeTeamId : existing.awayTeamId;

      const primaryParticipant = input.event.visualPayload.participants.at(0);
      const secondaryParticipant = input.event.visualPayload.participants.at(1);

      const primaryPlayerId = await this.resolvePersistedPlayerId({
        tx,
        teamId: possessionTeamId,
        ...(primaryParticipant?.playerId !== undefined ? { incomingId: primaryParticipant.playerId } : {}),
        ...(primaryParticipant?.displayName !== undefined ? { fallbackDisplayName: primaryParticipant.displayName } : {})
      });

      const opposingTeamId = possessionTeamId === existing.homeTeamId ? existing.awayTeamId : existing.homeTeamId;
      const secondaryPlayerId = await this.resolvePersistedPlayerId({
        tx,
        teamId: opposingTeamId,
        ...(secondaryParticipant?.playerId !== undefined ? { incomingId: secondaryParticipant.playerId } : {}),
        ...(secondaryParticipant?.displayName !== undefined
          ? { fallbackDisplayName: secondaryParticipant.displayName }
          : {})
      });

      const createdEvent = await tx.matchEvent.create({
        data: buildMatchEventCreateData({
          matchId: input.matchId,
          teamId: possessionTeamId,
          event: input.event,
          turnNumber: input.turnNumber,
          minute: input.minute,
          primaryPlayerId,
          secondaryPlayerId
        })
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
    visualPayload: Prisma.JsonValue;
  }): MatchEventView {
    const baseEvent: Omit<MatchEventView, "success"> = {
      id: event.id,
      key: this.mapEventTypeToKey(event.eventType),
      label: this.mapEventTypeToLabel(event.eventType),
      minute: event.minute,
      narrativeText: event.narrativeText,
      visualPayload: toVisualPayload(event.visualPayload)
    };

    if (event.success === null) {
      return baseEvent;
    }

    return {
      ...baseEvent,
      success: event.success
    };
  }

  private mapEventTypeToKey(eventType: MatchEventType): MatchEventView["key"] {
    switch (eventType) {
      case MatchEventType.PASS_RECEIVED:
        return "pass-received";
      case MatchEventType.PASS_INTERCEPTED:
        return "pass-intercepted";
      case MatchEventType.DRIBBLE:
        return "dribble";
      case MatchEventType.DEFENSIVE_DUEL:
        return "defensive-duel";
      case MatchEventType.SHOT:
        return "shot";
      case MatchEventType.GOALKEEPER_SAVE:
        return "goalkeeper-save";
      case MatchEventType.GOAL:
        return "goal";
      case MatchEventType.REBOUND:
        return "rebound";
      case MatchEventType.CORNER_KICK:
        return "corner-kick";
      case MatchEventType.PENALTY_KICK:
        return "penalty-kick";
      case MatchEventType.FALLBACK_MAP:
        return "fallback-map";
    }
  }

  private mapEventTypeToLabel(eventType: MatchEventType): string {
    switch (eventType) {
      case MatchEventType.PASS_RECEIVED:
        return "Passe Recebido";
      case MatchEventType.PASS_INTERCEPTED:
        return "Passe Interceptado";
      case MatchEventType.DRIBBLE:
        return "Drible";
      case MatchEventType.DEFENSIVE_DUEL:
        return "Duelo Defensivo";
      case MatchEventType.SHOT:
        return "Finalização";
      case MatchEventType.GOALKEEPER_SAVE:
        return "Defesa do goleiro";
      case MatchEventType.GOAL:
        return "Gol";
      case MatchEventType.REBOUND:
        return "Rebote";
      case MatchEventType.CORNER_KICK:
        return "Escanteio";
      case MatchEventType.PENALTY_KICK:
        return "Pênalti";
      case MatchEventType.FALLBACK_MAP:
        return "Mapa Tático";
    }
  }
}
