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
      currentUserControl: initialState.currentUserControl,
      currentEvent: { ...baseEvent, id: crypto.randomUUID() },
      recentEvents: []
    };
    this.eventHistory = [this.state.currentEvent];
    return this.state;
  }

  async getMatchState(matchId: string, currentUserId?: string): Promise<MatchStateView | null> {
    if (!this.state || this.state.matchId !== matchId) {
      return null;
    }

    const currentUserControl = this.buildCurrentUserControl(currentUserId ?? null, this.state);

    return {
      ...this.state,
      currentUserControl,
      recentEvents: this.eventHistory
        .filter((event) => event.id !== this.state?.currentEvent.id)
        .slice(-5)
        .reverse()
    };
  }

  async joinMatch(matchId: string, preferredUser?: { userId: string; displayName?: string }): Promise<{ userId: string; displayName: string } | null> {
    if (!this.state || this.state.matchId !== matchId) {
      return null;
    }

    if (preferredUser) {
      const authUser = {
        userId: preferredUser.userId,
        displayName: preferredUser.displayName?.trim() || "Jogador"
      };

      this.users.set(matchId, authUser);
      return authUser;
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
    const alreadyControlsOtherSlot = this.state.lineup.some(
      (lineupSlot) =>
        lineupSlot.controllerUserId === input.userId &&
        lineupSlot.controlMode === "HUMAN" &&
        !(lineupSlot.teamSide === input.teamSide && lineupSlot.slotNumber === input.slotNumber)
    );
    if (alreadyControlsOtherSlot) {
      return { error: "user-already-controls-slot" };
    }

    slot.controlMode = "HUMAN";
    slot.controllerUserId = input.userId;

    return {
      matchState: {
        ...this.state,
        currentUserControl: this.buildCurrentUserControl(input.userId, this.state)
      }
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

  private buildCurrentUserControl(currentUserId: string | null, state: MatchStateView): MatchStateView["currentUserControl"] {
    if (!currentUserId) {
      return {
        currentUserId: null,
        controlledSlots: [],
        controlledPlayerIds: [],
        currentEventParticipantControlledByUser: false,
        currentUserCanAct: false
      };
    }

    const controlledSlots = state.lineup
      .filter((slot) => slot.controllerUserId === currentUserId && slot.controlMode === "HUMAN")
      .map((slot) => ({
        teamSide: slot.teamSide,
        slotNumber: slot.slotNumber,
        playerId: slot.playerId,
        playerName: slot.playerName
      }));

    const controlledPlayerIds = controlledSlots.map((slot) => slot.playerId);
    const currentEventParticipantControlledByUser = state.currentEvent.visualPayload.participants.some((participant) =>
      controlledPlayerIds.includes(participant.playerId)
    );
    const currentUserCanAct =
      state.turnResolutionMode === "REQUIRES_PLAYER_ACTION" && currentEventParticipantControlledByUser;

    return {
      currentUserId,
      controlledSlots,
      controlledPlayerIds,
      currentEventParticipantControlledByUser,
      currentUserCanAct
    };
  }
}
