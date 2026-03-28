import { create } from "zustand";
import { ApiRequestError, matchApi } from "../infra/api/match-api";
import type { MatchStateView, PlayerActionIntent, TurnCycle } from "../shared/types/match";

const MATCH_ID_STORAGE_KEY = "telesoccer.currentMatchId";

const saveMatchId = (matchId: string): void => {
  localStorage.setItem(MATCH_ID_STORAGE_KEY, matchId);
};

const loadMatchId = (): string | null => localStorage.getItem(MATCH_ID_STORAGE_KEY);

const clearMatchId = (): void => {
  localStorage.removeItem(MATCH_ID_STORAGE_KEY);
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
};

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
      const storedMatchId = loadMatchId();

      if (storedMatchId) {
        const persistedMatchState = await matchApi.getMatchState(storedMatchId);
        set({ matchState: persistedMatchState, cycle: null, isLoading: false });
        return;
      }

      const matchState = await matchApi.createMatch("Azuis FC", "Rubro United");
      saveMatchId(matchState.matchId);
      set({ matchState, cycle: null, isLoading: false });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        clearMatchId();

        try {
          const matchState = await matchApi.createMatch("Azuis FC", "Rubro United");
          saveMatchId(matchState.matchId);
          set({ matchState, cycle: null, isLoading: false, errorMessage: null });
          return;
        } catch (retryError) {
          set({
            isLoading: false,
            errorMessage: toErrorMessage(retryError, "Falha ao criar partida")
          });
          return;
        }
      }

      set({
        isLoading: false,
        errorMessage: toErrorMessage(error, "Falha ao criar partida")
      });
    }
  },

  async refreshMatchState() {
    const matchId = get().matchState?.matchId ?? loadMatchId();
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const matchState = await matchApi.getMatchState(matchId);
      saveMatchId(matchState.matchId);
      set({ matchState, cycle: null, isLoading: false });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        clearMatchId();
        set({ isLoading: false, matchState: null, cycle: null, errorMessage: "Partida não encontrada." });
        return;
      }

      set({
        isLoading: false,
        errorMessage: toErrorMessage(error, "Falha ao atualizar estado")
      });
    }
  },

  async sendAction(action: PlayerActionIntent) {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const { matchState, cycle } = await matchApi.submitAction(matchId, action);
      saveMatchId(matchState.matchId);
      set({ matchState, cycle, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: toErrorMessage(error, "Falha ao enviar ação")
      });
    }
  },

  async advanceTurn() {
    const matchId = get().matchState?.matchId;
    if (!matchId) return;

    try {
      set({ isLoading: true, errorMessage: null });
      const { matchState, cycle } = await matchApi.advanceTurn(matchId);
      saveMatchId(matchState.matchId);
      set({ matchState, cycle, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: toErrorMessage(error, "Falha ao avançar turno")
      });
    }
  }
}));
