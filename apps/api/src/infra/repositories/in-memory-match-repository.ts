import type { MatchRepository, PersistTurnInput } from "../../domain/repositories/match-repository.js";
import type { MatchEventView, MatchStateView, SceneCatalogItem } from "../../shared/contracts/match-contracts.js";

const baseEvent: MatchEventView = {
  id: "evt-1",
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

export class InMemoryMatchRepository implements MatchRepository {
  private state: MatchStateView | null = null;
  private eventHistory: MatchEventView[] = [];

  async createMatch(homeTeamName: string, awayTeamName: string, initialState: MatchStateView): Promise<MatchStateView> {
    this.state = {
      ...initialState,
      matchId: crypto.randomUUID(),
      homeTeamName,
      awayTeamName,
      currentEvent: { ...baseEvent, id: crypto.randomUUID() },
      recentEvents: []
    };
    this.eventHistory = [this.state.currentEvent];
    return this.state;
  }

  async getMatchState(matchId: string): Promise<MatchStateView | null> {
    if (!this.state || this.state.matchId !== matchId) {
      return null;
    }

    return {
      ...this.state,
      recentEvents: this.eventHistory
        .filter((event) => event.id !== this.state?.currentEvent.id)
        .slice(-5)
        .reverse()
    };
  }

  async persistTurn(input: PersistTurnInput): Promise<MatchStateView | null> {
    if (!this.state || this.state.matchId !== input.matchId) {
      return null;
    }

    this.eventHistory.push(input.event);

    this.state = {
      ...this.state,
      minute: input.minute,
      turnNumber: input.turnNumber,
      possessionTeamSide: input.possessionTeamSide,
      turnResolutionMode: input.turnResolutionMode,
      availableActions: input.availableActions,
      currentEvent: input.event,
      recentEvents: this.eventHistory
        .filter((event) => event.id !== input.event.id)
        .slice(-5)
        .reverse()
    };

    return this.state;
  }

  async getSceneCatalog(): Promise<SceneCatalogItem[]> {
    return sceneCatalog;
  }
}
