import { create } from "zustand";
import { authApi } from "../infra/api/auth-api";
import { matchApi } from "../infra/api/match-api";
import type { AuthUserView, MatchStateView, PlayerActionIntent, TeamSide, TurnCycle } from "../shared/types/match";

type MatchUiState = {
  matchState: MatchStateView | null;
  cycle: TurnCycle | null;
  userId: string | null;
  userDisplayName: string | null;
  authToken: string | null;
  authUser: AuthUserView | null;
  isLoading: boolean;
  errorMessage: string | null;
  bootstrapMatch: () => Promise<void>;
  refreshMatchState: () => Promise<void>;
  registerAndJoin: (input: { email: string; displayName: string; password: string }) => Promise<void>;
  loginAndJoin: (input: { email: string; password: string }) => Promise<void>;
  joinMatch: () => Promise<void>;
  claimSlot: (teamSide: TeamSide, slotNumber: number) => Promise<void>;
  sendAction: (action: PlayerActionIntent) => Promise<void>;
  advanceTurn: () => Promise<void>;
};

const toFriendlyAuthError = (raw: string): string => {
  if (raw === "email-already-in-use") return "Este e-mail já está em uso.";
  if (raw === "invalid-credentials") return "E-mail ou senha inválidos.";
  if (raw === "missing-bearer-token" || raw === "invalid-or-expired-token") {
    return "Sessão inválida. Faça login novamente.";
  }
  return raw;
};

export const useMatchUiStore = create<MatchUiState>((set, get) => ({
  matchState: null,
  cycle: null,
  userId: null,
  userDisplayName: null,
  authToken: null,
  authUser: null,
  isLoading: false,
  errorMessage: null,

  async bootstrapMatch() {
    try {
      set({ isLoading: true, errorMessage: null });
      const matchState = await matchApi.createMatch("Azuis FC", "Rubro United");
      set({ matchState, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao criar partida"
      });
    }
  },

  async refreshMatchState() {
    const { matchState, userId } = get();
    const matchId = matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const refreshed = await matchApi.getMatchState(matchId, userId ?? undefined);
      set({ matchState: refreshed, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao atualizar estado"
      });
    }
  },

  async registerAndJoin(input) {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const session = await authApi.register(input);
      const user = await matchApi.joinMatch(matchId, {
        userId: session.user.id,
        displayName: session.user.displayName
      });
      const refreshed = await matchApi.getMatchState(matchId, user.userId);

      set({
        authToken: session.accessToken,
        authUser: session.user,
        userId: user.userId,
        userDisplayName: user.displayName,
        matchState: refreshed,
        isLoading: false
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Falha ao registrar usuário";
      set({ isLoading: false, errorMessage: toFriendlyAuthError(raw) });
    }
  },

  async loginAndJoin(input) {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const session = await authApi.login(input);
      const user = await matchApi.joinMatch(matchId, {
        userId: session.user.id,
        displayName: session.user.displayName
      });
      const refreshed = await matchApi.getMatchState(matchId, user.userId);

      set({
        authToken: session.accessToken,
        authUser: session.user,
        userId: user.userId,
        userDisplayName: user.displayName,
        matchState: refreshed,
        isLoading: false
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Falha ao autenticar usuário";
      set({ isLoading: false, errorMessage: toFriendlyAuthError(raw) });
    }
  },

  async joinMatch() {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const user = await matchApi.joinMatch(matchId);
      if (!user.userId) {
        throw new Error("Não foi possível identificar o usuário para entrar na partida");
      }

      const refreshed = await matchApi.getMatchState(matchId, user.userId);
      set({
        matchState: refreshed,
        userId: user.userId,
        userDisplayName: user.displayName,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao entrar na partida"
      });
    }
  },

  async claimSlot(teamSide: TeamSide, slotNumber: number) {
    const state = get();
    const matchId = state.matchState?.matchId;
    if (!matchId || !state.userId) {
      set({ errorMessage: "Faça login e entre na partida antes de assumir uma vaga." });
      return;
    }

    try {
      set({ isLoading: true, errorMessage: null });
      const matchState = await matchApi.claimSlot({
        matchId,
        teamSide,
        slotNumber,
        userId: state.userId
      });

      set({ matchState, isLoading: false });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Falha ao assumir vaga";
      const errorMessage =
        raw === "slot-already-claimed"
          ? "Esta vaga já foi assumida por outro usuário."
          : raw === "user-already-controls-slot"
            ? "Você já controla uma vaga nesta partida."
            : raw === "slot-not-found"
              ? "A vaga selecionada não existe."
              : raw === "user-not-found"
                ? "Usuário não encontrado. Faça login novamente."
                : raw;

      set({
        isLoading: false,
        errorMessage
      });
    }
  },

  async sendAction(action: PlayerActionIntent) {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const { matchState, cycle } = await matchApi.submitAction(matchId, action);
      const refreshed = await matchApi.getMatchState(matchId, get().userId ?? undefined);
      set({ matchState: refreshed ?? matchState, cycle, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao enviar ação"
      });
    }
  },

  async advanceTurn() {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const { matchState, cycle } = await matchApi.advanceTurn(matchId);
      const refreshed = await matchApi.getMatchState(matchId, get().userId ?? undefined);
      set({ matchState: refreshed ?? matchState, cycle, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao avançar turno"
      });
    }
  }
}));
