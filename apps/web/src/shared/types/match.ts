export type TeamSide = "HOME" | "AWAY";

export type PlayerActionIntent =
  | "PASS"
  | "DRIBBLE"
  | "SHOT"
  | "PROTECT_BALL"
  | "PASS_BACK"
  | "SWITCH_PLAY";

export type TurnResolutionMode = "AUTO" | "REQUIRES_PLAYER_ACTION";

export interface VisualPayload {
  frameType: "TACTICAL_MAP" | "DUEL_SCENE" | "SHOT_SCENE" | "SAVE_SCENE" | "GOAL_SCENE";
  sceneKey: string;
  zone: string;
  assetPath: string;
}

export interface MatchEventView {
  id: string;
  label: string;
  minute: number;
  narrativeText: string;
  visualPayload: VisualPayload;
}

export interface MatchStateView {
  matchId: string;
  minute: number;
  score: {
    home: number;
    away: number;
  };
  homeTeamName: string;
  awayTeamName: string;
  possessionTeamSide: TeamSide;
  turnNumber: number;
  turnResolutionMode: TurnResolutionMode;
  availableActions: PlayerActionIntent[];
  currentEvent: MatchEventView;
  recentEvents: MatchEventView[];
}

export interface TurnCycle {
  mode: TurnResolutionMode;
  nextExpectedAction: "ADVANCE_TURN" | "SUBMIT_ACTION";
}

export interface ApiResponse<T> {
  data: T;
}
