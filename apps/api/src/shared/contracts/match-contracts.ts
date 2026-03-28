export type TeamSide = "HOME" | "AWAY";

export type MatchZone =
  | "DEFENSIVE_THIRD"
  | "MIDDLE_THIRD"
  | "ATTACKING_THIRD"
  | "PENALTY_BOX"
  | "WING_LEFT"
  | "WING_RIGHT"
  | "CENTER_CHANNEL";

export type FrameType =
  | "TACTICAL_MAP"
  | "DUEL_SCENE"
  | "SHOT_SCENE"
  | "SAVE_SCENE"
  | "GOAL_SCENE";

export type MatchEventKey =
  | "pass-received"
  | "pass-intercepted"
  | "dribble"
  | "defensive-duel"
  | "shot"
  | "goalkeeper-save"
  | "goal"
  | "rebound"
  | "corner-kick"
  | "penalty-kick"
  | "fallback-map";

export type PlayerActionIntent =
  | "PASS"
  | "DRIBBLE"
  | "SHOT"
  | "PROTECT_BALL"
  | "PASS_BACK"
  | "SWITCH_PLAY";

export type TurnResolutionMode = "AUTO" | "REQUIRES_PLAYER_ACTION";
export type LineupControlMode = "HUMAN" | "BOT";

export interface VisualParticipant {
  playerId: string;
  displayName: string;
  side: TeamSide;
  role: "PRIMARY" | "SECONDARY" | "GOALKEEPER" | "SUPPORT";
  relativeX: number;
  relativeY: number;
  hasBall: boolean;
}

export interface BallHighlight {
  x: number;
  y: number;
  possessionTeamSide: TeamSide;
}

export interface VisualPayload {
  renderer: "asset" | "composed";
  frameType: FrameType;
  sceneKey: string;
  zone: MatchZone;
  attackingSide: TeamSide;
  ball: BallHighlight;
  participants: VisualParticipant[];
  assetPath: string;
  metadata: {
    camera: "top" | "close";
    intensity: "low" | "medium" | "high";
    tags: string[];
  };
}

export interface MatchEventView {
  id: string;
  key: MatchEventKey;
  label: string;
  minute: number;
  narrativeText: string;
  success?: boolean;
  visualPayload: VisualPayload;
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface MatchLineupSlotView {
  teamSide: TeamSide;
  slotNumber: number;
  playerId: string;
  playerName: string;
  position: string;
  isCaptain: boolean;
  controlMode: LineupControlMode;
  controllerUserId: string | null;
}

export interface MatchStateView {
  matchId: string;
  minute: number;
  score: MatchScore;
  homeTeamName: string;
  awayTeamName: string;
  possessionTeamSide: TeamSide;
  turnNumber: number;
  turnResolutionMode: TurnResolutionMode;
  availableActions: PlayerActionIntent[];
  lineup: MatchLineupSlotView[];
  currentEvent: MatchEventView;
  recentEvents: MatchEventView[];
}

export interface SceneCatalogItem {
  sceneKey: string;
  frameType: FrameType;
  tags: string[];
  zone: MatchZone;
  side: TeamSide | "BOTH";
  participantsCount: 1 | 2 | 3 | 4;
  assetPath: string;
  fallbackRules: {
    fallbackSceneKey: string;
    when: "missing-asset" | "unsupported-zone" | "unsupported-side";
  }[];
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    generatedAt: string;
    requestId: string;
  };
}

export interface TurnAdvanceResponse {
  matchState: MatchStateView;
  cycle: {
    mode: TurnResolutionMode;
    reason:
      | "auto-step"
      | "action-required"
      | "match-ended"
      | "post-goal-restart"
      | "defensive-transition";
    nextExpectedAction: "ADVANCE_TURN" | "SUBMIT_ACTION";
  };
}

export interface MatchJoinView {
  userId: string;
  displayName: string;
}

export type ClaimSlotFailureReason =
  | "match-not-found"
  | "slot-not-found"
  | "slot-already-claimed"
  | "user-not-found";
