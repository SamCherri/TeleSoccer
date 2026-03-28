import type { ApiResponse, MatchStateView, PlayerActionIntent, TurnCycle } from "../../shared/types/match";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

export const matchApi = {
  async createMatch(homeTeamName: string, awayTeamName: string): Promise<MatchStateView> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>("/matches", {
      method: "POST",
      body: JSON.stringify({ homeTeamName, awayTeamName })
    });

    return payload.data.matchState;
  },

  async getMatchState(matchId: string): Promise<MatchStateView> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>(
      `/matches/${matchId}/state`
    );

    return payload.data.matchState;
  },

  async submitAction(
    matchId: string,
    action: PlayerActionIntent
  ): Promise<{ matchState: MatchStateView; cycle: TurnCycle }> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView; cycle: TurnCycle }>>(
      `/matches/${matchId}/actions`,
      {
        method: "POST",
        body: JSON.stringify({ action })
      }
    );

    return payload.data;
  },

  async advanceTurn(matchId: string): Promise<{ matchState: MatchStateView; cycle: TurnCycle }> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView; cycle: TurnCycle }>>(
      `/matches/${matchId}/advance`,
      {
        method: "POST"
      }
    );

    return payload.data;
  }
};
