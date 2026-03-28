import type { MatchRepository, PersistTurnInput } from "../../domain/repositories/match-repository.js";
import type {
  ClaimSlotFailureReason,
  MatchEventView,
  MatchLineupSlotView,
  MatchStateView,
  SceneCatalogItem,
  TeamSide
} from "../../shared/contracts/match-contracts.js";

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
  private users = new Map<string, { userId: string; displayName: string }>();

  async createMatch(homeTeamName: string, awayTeamName: string, initialState: MatchStateView): Promise<MatchStateView> {
    const lineup = this.buildStarterLineup();

    this.state = {
      ...initialState,
      matchId: crypto.randomUUID(),
      homeTeamName,
      awayTeamName,
      lineup,
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

  async joinMatch(matchId: string): Promise<{ userId: string; displayName: string } | null> {
    if (!this.state || this.state.matchId !== matchId) {
      return null;
    }

    const existing = this.users.get(matchId);
    if (existing) {
      return existing;
    }

    const bootstrapUser = {
      userId: `bootstrap-${matchId}`,
      displayName: "Jogador MVP"
    };

    this.users.set(matchId, bootstrapUser);
    return bootstrapUser;
  }

  async claimLineupSlot(input: {
    matchId: string;
    teamSide: TeamSide;
    slotNumber: number;
    userId: string;
  }): Promise<{ matchState: MatchStateView } | { error: ClaimSlotFailureReason }> {
    if (!this.state || this.state.matchId !== input.matchId) {
      return { error: "match-not-found" };
    }

    if (![...this.users.values()].some((user) => user.userId === input.userId)) {
      return { error: "user-not-found" };
    }

    const slot = this.state.lineup.find(
      (item) => item.teamSide === input.teamSide && item.slotNumber === input.slotNumber
    );

    if (!slot) {
      return { error: "slot-not-found" };
    }

    if (slot.controlMode === "HUMAN" && slot.controllerUserId !== input.userId) {
      return { error: "slot-already-claimed" };
    }

    slot.controlMode = "HUMAN";
    slot.controllerUserId = input.userId;

    return { matchState: this.state };
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

  private buildStarterLineup(): MatchLineupSlotView[] {
    const positions = ["GK", "RB", "RCB", "LCB", "LB", "CDM", "RCM", "LCM", "RW", "ST", "LW"] as const;

    const createTeamLineup = (teamSide: TeamSide) =>
      positions.map((position, index) => ({
        teamSide,
        slotNumber: index + 1,
        playerId: `${teamSide}-player-${index + 1}`,
        playerName:
          teamSide === "HOME" && index + 1 === 8
            ? "Henrique"
            : teamSide === "AWAY" && index + 1 === 5
              ? "Eduardo"
              : `${teamSide}-PLAYER-${index + 1}`,
        position,
        isCaptain: teamSide === "HOME" ? index + 1 === 8 : index + 1 === 5,
        controlMode: "BOT" as const,
        controllerUserId: null
      }));

    return [...createTeamLineup("HOME"), ...createTeamLineup("AWAY")];
  }
}
