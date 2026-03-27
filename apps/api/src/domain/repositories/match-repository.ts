import type {
  MatchEventView,
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
  getMatchState(matchId: string): Promise<MatchStateView | null>;
  persistTurn(input: PersistTurnInput): Promise<MatchStateView | null>;
  getSceneCatalog(): Promise<SceneCatalogItem[]>;
}
