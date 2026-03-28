import type {
  ApiResponse,
  MatchJoinView,
  MatchStateView,
  PlayerActionIntent,
  TeamSide,
  TurnCycle
} from "../../shared/types/match";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const errorText = await response.text();
    let apiError: string | null = null;
    try {
      const errorPayload = JSON.parse(errorText) as { data?: { error?: string } };
      apiError = errorPayload.data?.error ?? null;
    } catch {
      // fallback abaixo
    }

    if (apiError) {
      throw new Error(apiError);
    }

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

  async getMatchState(matchId: string, userId?: string): Promise<MatchStateView> {
    const search = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>(
      `/matches/${matchId}/state${search}`
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
  },

  async joinMatch(matchId: string): Promise<MatchJoinView> {
    const payload = await request<ApiResponse<{ user: MatchJoinView }>>(`/matches/${matchId}/join`, {
      method: "POST"
    });

    return payload.data.user;
  },

  async claimSlot(input: {
    matchId: string;
    teamSide: TeamSide;
    slotNumber: number;
    userId: string;
  }): Promise<MatchStateView> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>(
      `/matches/${input.matchId}/claim-slot`,
      {
        method: "POST",
        body: JSON.stringify({
          teamSide: input.teamSide,
          slotNumber: input.slotNumber,
          userId: input.userId
        })
      }
    );

    return payload.data.matchState;
  }
};
