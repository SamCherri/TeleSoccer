import {
  resolveAdvanceTurnDomain,
  resolveCycle,
  resolveInteractiveActionDomain
} from "../../domain/entities/match-aggregate.js";
import type { MatchRepository } from "../../domain/repositories/match-repository.js";
import type {
  MatchStateView,
  PlayerActionIntent,
  TurnAdvanceResponse
} from "../../shared/contracts/match-contracts.js";

const buildBaseState = (): MatchStateView => ({
  matchId: "match-bootstrap",
  minute: 1,
  score: { home: 0, away: 0 },
  homeTeamName: "Azuis FC",
  awayTeamName: "Rubro United",
  possessionTeamSide: "HOME",
  turnNumber: 1,
  turnResolutionMode: "REQUIRES_PLAYER_ACTION",
  availableActions: ["PASS", "DRIBBLE", "PASS_BACK", "SWITCH_PLAY"],
  currentEvent: {
    id: "evt-bootstrap",
    key: "pass-received",
    label: "Passe Recebido",
    minute: 1,
    narrativeText: "Henrique domina e levanta a cabeça para organizar a jogada.",
    success: true,
    visualPayload: {
      renderer: "asset",
      frameType: "TACTICAL_MAP",
      sceneKey: "fallback-map-default",
      zone: "MIDDLE_THIRD",
      attackingSide: "HOME",
      ball: { x: 44, y: 56, possessionTeamSide: "HOME" },
      participants: [
        {
          playerId: "p-home-8",
          displayName: "Henrique",
          side: "HOME",
          role: "PRIMARY",
          relativeX: 44,
          relativeY: 56,
          hasBall: true
        },
        {
          playerId: "p-away-5",
          displayName: "Eduardo",
          side: "AWAY",
          role: "SECONDARY",
          relativeX: 50,
          relativeY: 54,
          hasBall: false
        }
      ],
      assetPath: "/assets/scenes/tactical/fallback-map-default.png",
      metadata: {
        camera: "top",
        intensity: "low",
        tags: ["build-up", "midfield"]
      }
    }
  },
  recentEvents: []
});

export class MatchApplicationService {
  constructor(private readonly repository: MatchRepository) {}

  getSceneCatalog() {
    return this.repository.getSceneCatalog();
  }

  createMatch(homeTeamName: string, awayTeamName: string) {
    return this.repository.createMatch(homeTeamName, awayTeamName, buildBaseState());
  }

  getMatchState(matchId: string) {
    return this.repository.getMatchState(matchId);
  }

  async submitAction(matchId: string, action: PlayerActionIntent): Promise<TurnAdvanceResponse | null> {
    const current = await this.repository.getMatchState(matchId);
    if (!current) {
      return null;
    }

    const domainResult = resolveInteractiveActionDomain(current, action);

    const nextState = await this.repository.persistTurn({
      matchId,
      minute: domainResult.minute,
      turnNumber: domainResult.turnNumber,
      possessionTeamSide: domainResult.nextPossessionTeamSide,
      turnResolutionMode: domainResult.turnResolutionMode,
      availableActions: domainResult.availableActions,
      event: domainResult.event
    });

    if (!nextState) {
      return null;
    }

    return {
      matchState: nextState,
      cycle: resolveCycle(nextState)
    };
  }

  async advanceTurn(matchId: string): Promise<TurnAdvanceResponse | null> {
    const current = await this.repository.getMatchState(matchId);
    if (!current) {
      return null;
    }

    const domainResult = resolveAdvanceTurnDomain(current);

    const nextState = await this.repository.persistTurn({
      matchId,
      minute: domainResult.minute,
      turnNumber: domainResult.turnNumber,
      possessionTeamSide: domainResult.nextPossessionTeamSide,
      turnResolutionMode: domainResult.turnResolutionMode,
      availableActions: domainResult.availableActions,
      event: domainResult.event
    });

    if (!nextState) {
      return null;
    }

    return {
      matchState: nextState,
      cycle: resolveCycle(nextState)
    };
  }
}
