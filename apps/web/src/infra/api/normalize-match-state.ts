import type {
  CurrentUserControlView,
  MatchEventView,
  MatchLineupSlotView,
  MatchStateView,
  PlayerActionIntent,
  TeamSide,
  TurnResolutionMode,
  VisualPayload
} from "../../shared/types/match";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asTeamSide = (value: unknown, fallback: TeamSide = "HOME"): TeamSide =>
  value === "HOME" || value === "AWAY" ? value : fallback;

const asTurnResolutionMode = (
  value: unknown,
  fallback: TurnResolutionMode = "AUTO"
): TurnResolutionMode => (value === "AUTO" || value === "REQUIRES_PLAYER_ACTION" ? value : fallback);

const validActionIntents: ReadonlyArray<PlayerActionIntent> = [
  "PASS",
  "DRIBBLE",
  "SHOT",
  "PROTECT_BALL",
  "PASS_BACK",
  "SWITCH_PLAY"
];

const asPlayerActionIntent = (value: unknown): PlayerActionIntent | null =>
  typeof value === "string" && validActionIntents.includes(value as PlayerActionIntent)
    ? (value as PlayerActionIntent)
    : null;

const normalizeVisualPayload = (value: unknown): VisualPayload => {
  const raw = isRecord(value) ? value : {};
  const frameType = raw.frameType;

  return {
    frameType:
      frameType === "TACTICAL_MAP" ||
      frameType === "DUEL_SCENE" ||
      frameType === "SHOT_SCENE" ||
      frameType === "SAVE_SCENE" ||
      frameType === "GOAL_SCENE"
        ? frameType
        : "TACTICAL_MAP",
    sceneKey: asString(raw.sceneKey, "fallback-scene"),
    zone: asString(raw.zone, "MIDFIELD"),
    assetPath: asString(raw.assetPath, "")
  };
};

const normalizeEvent = (value: unknown, index = 0): MatchEventView => {
  const raw = isRecord(value) ? value : {};

  return {
    id: asString(raw.id, `event-${index}`),
    label: asString(raw.label, "Lance em andamento"),
    minute: asNumber(raw.minute, 0),
    narrativeText: asString(raw.narrativeText, "Sem narração disponível no momento."),
    visualPayload: normalizeVisualPayload(raw.visualPayload)
  };
};

const normalizeLineupSlot = (value: unknown, index = 0): MatchLineupSlotView => {
  const raw = isRecord(value) ? value : {};

  return {
    teamSide: asTeamSide(raw.teamSide),
    slotNumber: asNumber(raw.slotNumber, index + 1),
    playerId: asString(raw.playerId, ""),
    playerName: asString(raw.playerName, "Jogador não identificado"),
    position: asString(raw.position, "POS"),
    isCaptain: raw.isCaptain === true,
    controlMode: raw.controlMode === "HUMAN" ? "HUMAN" : "BOT",
    controllerUserId: typeof raw.controllerUserId === "string" ? raw.controllerUserId : null
  };
};

const normalizeCurrentUserControl = (value: unknown): CurrentUserControlView => {
  const raw = isRecord(value) ? value : {};
  const controlledSlotsRaw = Array.isArray(raw.controlledSlots) ? raw.controlledSlots : [];
  const controlledPlayerIdsRaw = Array.isArray(raw.controlledPlayerIds) ? raw.controlledPlayerIds : [];

  return {
    currentUserId: typeof raw.currentUserId === "string" ? raw.currentUserId : null,
    controlledSlots: controlledSlotsRaw
      .map((slot) => {
        const parsed = isRecord(slot) ? slot : null;
        if (!parsed) return null;

        return {
          teamSide: asTeamSide(parsed.teamSide),
          slotNumber: asNumber(parsed.slotNumber, 0),
          playerId: asString(parsed.playerId, ""),
          playerName: asString(parsed.playerName, "Jogador")
        };
      })
      .filter((slot): slot is CurrentUserControlView["controlledSlots"][number] => slot !== null),
    controlledPlayerIds: controlledPlayerIdsRaw.filter((id): id is string => typeof id === "string"),
    currentEventParticipantControlledByUser: raw.currentEventParticipantControlledByUser === true,
    currentUserCanAct: raw.currentUserCanAct === true
  };
};

export const normalizeMatchState = (value: unknown): MatchStateView => {
  const raw = isRecord(value) ? value : {};
  const lineupRaw = Array.isArray(raw.lineup) ? raw.lineup : [];
  const recentEventsRaw = Array.isArray(raw.recentEvents) ? raw.recentEvents : [];
  const availableActionsRaw = Array.isArray(raw.availableActions) ? raw.availableActions : [];

  return {
    matchId: asString(raw.matchId, ""),
    minute: asNumber(raw.minute, 0),
    score: {
      home: asNumber(isRecord(raw.score) ? raw.score.home : undefined, 0),
      away: asNumber(isRecord(raw.score) ? raw.score.away : undefined, 0)
    },
    homeTeamName: asString(raw.homeTeamName, "Time da casa"),
    awayTeamName: asString(raw.awayTeamName, "Time visitante"),
    possessionTeamSide: asTeamSide(raw.possessionTeamSide),
    turnNumber: asNumber(raw.turnNumber, 1),
    turnResolutionMode: asTurnResolutionMode(raw.turnResolutionMode),
    availableActions: availableActionsRaw
      .map((action) => asPlayerActionIntent(action))
      .filter((action): action is PlayerActionIntent => action !== null),
    lineup: lineupRaw.map((slot, index) => normalizeLineupSlot(slot, index)),
    currentUserControl: normalizeCurrentUserControl(raw.currentUserControl),
    currentEvent: normalizeEvent(raw.currentEvent),
    recentEvents: recentEventsRaw.map((event, index) => normalizeEvent(event, index))
  };
};
