import type {
  MatchEventKey,
  MatchStateView,
  MatchZone,
  PlayerActionIntent,
  TeamSide,
  TurnResolutionMode
} from "../../shared/contracts/match-contracts.js";

export type EngineContext = {
  state: MatchStateView;
  minute: number;
  turnNumber: number;
  possessionTeamSide: TeamSide;
  currentZone: MatchZone;
};

export type CanonicalEventSeed = {
  key: MatchEventKey;
  label: string;
  narrativeText: string;
  sceneKey: string;
  frameType: MatchStateView["currentEvent"]["visualPayload"]["frameType"];
  success: boolean;
  zone: MatchZone;
  nextPossessionTeamSide: TeamSide;
};

export type ActionResolutionInput = EngineContext & {
  action: PlayerActionIntent;
};

export type TurnTransitionResult = {
  nextMinute: number;
  nextTurnNumber: number;
  nextTurnResolutionMode: TurnResolutionMode;
  nextAvailableActions: PlayerActionIntent[];
  event: CanonicalEventSeed;
};
