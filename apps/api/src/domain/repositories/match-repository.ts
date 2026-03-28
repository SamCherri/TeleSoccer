import type {
  ClaimSlotFailureReason,
  MatchEventView,
  MatchJoinView,
  MatchStateView,
  PlayerActionIntent,
  SceneCatalogItem,
  TeamSide
} from "../../shared/contracts/match-contracts.js";

export type PersistTurnInput = {
  matchId: string;
  minute: number;
  turnNumber: number;
  possessionTeamSide: TeamSide;
  turnResolutionMode: MatchStateView["turnResolutionMode"];
  availableActions: PlayerActionIntent[];
  event: MatchEventView;
};

export interface MatchRepository {
  createMatch(homeTeamName: string, awayTeamName: string, initialState: MatchStateView): Promise<MatchStateView>;
  getMatchState(matchId: string, currentUserId?: string): Promise<MatchStateView | null>;
  joinMatch(matchId: string): Promise<MatchJoinView | null>;
  claimLineupSlot(input: {
    matchId: string;
    teamSide: TeamSide;
    slotNumber: number;
    userId: string;
  }): Promise<{ matchState: MatchStateView } | { error: ClaimSlotFailureReason }>;
  persistTurn(input: PersistTurnInput): Promise<MatchStateView | null>;
  getSceneCatalog(): Promise<SceneCatalogItem[]>;
}
