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
  VisualParticipant,
  VisualPayload
} from "../../shared/contracts/match-contracts.js";

const defaultTacticalContext = {
  zone: "MIDDLE_THIRD",
  notes: "Estado inicial em persistência real"
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toPrismaNullableInputJsonValue = (value: unknown): Prisma.InputJsonValue | null => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPrismaNullableInputJsonValue(item));
  }

  if (isPlainObject(value)) {
    const jsonObject: { [key: string]: Prisma.InputJsonValue | null } = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue === undefined) {
        continue;
      }
      jsonObject[key] = toPrismaNullableInputJsonValue(nestedValue);
    }
    return jsonObject;
  }

  throw new TypeError("Valor inválido para persistência JSON no Prisma.");
};

const toPrismaInputJsonValue = (value: unknown): Prisma.InputJsonValue => {
  const jsonValue = toPrismaNullableInputJsonValue(value);
  if (jsonValue === null) {
    throw new TypeError("JSON no topo não pode ser null para Prisma.InputJsonValue.");
  }
  return jsonValue;
};

const isPrismaInputJsonObject = (value: Prisma.InputJsonValue): value is Prisma.InputJsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !("toJSON" in value);

const toPrismaInputJsonObject = (value: unknown): Prisma.InputJsonObject => {
  const jsonValue = toPrismaInputJsonValue(value);
  if (!isPrismaInputJsonObject(jsonValue)) {
    throw new TypeError("visualPayload deve ser um objeto JSON.");
  }
  return jsonValue;
};

const isPrismaJsonValue = (value: unknown): value is Prisma.JsonValue => {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isPrismaJsonValue(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).every((item) => isPrismaJsonValue(item));
  }

  return false;
};

const isVisualPayload = (value: unknown): value is VisualPayload => {
  if (!isPlainObject(value)) {
    return false;
  }

  const isTeamSide = (side: unknown): side is TeamSide => side === "HOME" || side === "AWAY";
  const isFrameType = (frameType: unknown): frameType is VisualPayload["frameType"] =>
    frameType === "TACTICAL_MAP" ||
    frameType === "DUEL_SCENE" ||
    frameType === "SHOT_SCENE" ||
    frameType === "SAVE_SCENE" ||
    frameType === "GOAL_SCENE";
  const isZone = (zone: unknown): zone is VisualPayload["zone"] =>
    zone === "DEFENSIVE_THIRD" ||
    zone === "MIDDLE_THIRD" ||
    zone === "ATTACKING_THIRD" ||
    zone === "PENALTY_BOX" ||
    zone === "WING_LEFT" ||
    zone === "WING_RIGHT" ||
    zone === "CENTER_CHANNEL";
  const isRenderer = (renderer: unknown): renderer is VisualPayload["renderer"] =>
    renderer === "asset" || renderer === "composed";

  return (
    isRenderer(value.renderer) &&
    isFrameType(value.frameType) &&
    typeof value.sceneKey === "string" &&
    isZone(value.zone) &&
    isTeamSide(value.attackingSide) &&
    typeof value.assetPath === "string" &&
    isPlainObject(value.ball) &&
    typeof value.ball.x === "number" &&
    typeof value.ball.y === "number" &&
    isTeamSide(value.ball.possessionTeamSide) &&
    Array.isArray(value.participants) &&
    value.participants.every(
      (participant) =>
        isPlainObject(participant) &&
        typeof participant.playerId === "string" &&
        typeof participant.displayName === "string" &&
        isTeamSide(participant.side) &&
        (participant.role === "PRIMARY" ||
          participant.role === "SECONDARY" ||
          participant.role === "GOALKEEPER" ||
          participant.role === "SUPPORT") &&
        typeof participant.relativeX === "number" &&
        typeof participant.relativeY === "number" &&
        typeof participant.hasBall === "boolean"
    ) &&
    isPlainObject(value.metadata) &&
    (value.metadata.camera === "top" || value.metadata.camera === "close") &&
    (value.metadata.intensity === "low" || value.metadata.intensity === "medium" || value.metadata.intensity === "high") &&
    Array.isArray(value.metadata.tags)
  );
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

const mapFrameType = (frameType: VisualPayload["frameType"]): FrameType => {
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
  visualPayload: toPrismaInputJsonObject(event.visualPayload),
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
      visualPayload: this.mapVisualPayload(event.visualPayload)
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

  private mapVisualPayload(visualPayload: Prisma.JsonValue): VisualPayload {
    if (!isPrismaJsonValue(visualPayload) || !isVisualPayload(visualPayload)) {
      throw new TypeError("visualPayload persistido está inválido para o contrato de MatchEventView.");
    }

    return visualPayload;
  }
}
