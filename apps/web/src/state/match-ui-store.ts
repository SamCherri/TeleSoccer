import { create } from "zustand";
import { matchApi } from "../infra/api/match-api";
import type { MatchStateView, PlayerActionIntent, TurnCycle } from "../shared/types/match";

type MatchUiState = {
  matchState: MatchStateView | null;
  cycle: TurnCycle | null;
  isLoading: boolean;
  errorMessage: string | null;
  bootstrapMatch: () => Promise<void>;
  refreshMatchState: () => Promise<void>;
  sendAction: (action: PlayerActionIntent) => Promise<void>;
  advanceTurn: () => Promise<void>;
};

export const useMatchUiStore = create<MatchUiState>((set, get) => ({
  matchState: null,
  cycle: null,
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
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const matchState = await matchApi.getMatchState(matchId);
      set({ matchState, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao atualizar estado"
      });
    }
  },

  async sendAction(action) {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const { matchState, cycle } = await matchApi.submitAction(matchId, action);
      set({ matchState, cycle, isLoading: false });
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
      set({ matchState, cycle, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : "Falha ao avançar turno"
      });
    }
  }
}));
