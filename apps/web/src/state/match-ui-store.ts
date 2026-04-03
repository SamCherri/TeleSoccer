import type { MatchState } from '../shared/types/match.js';

export interface MatchUiState {
  loading: boolean;
  match: MatchState | null;
  error: string | null;
}

export const initialMatchUiState: MatchUiState = {
  loading: false,
  match: null,
  error: null
};
