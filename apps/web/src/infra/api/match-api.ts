import { normalizeMatchState } from "./normalize-match-state";
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

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const extractMatchState = (payload: unknown): MatchStateView => {
  const data = asRecord(asRecord(payload).data);
  return normalizeMatchState(data.matchState);
};

const normalizeCycle = (value: unknown): TurnCycle => {
  const raw = asRecord(value);

  return {
    mode: raw.mode === "REQUIRES_PLAYER_ACTION" ? "REQUIRES_PLAYER_ACTION" : "AUTO",
    nextExpectedAction: raw.nextExpectedAction === "SUBMIT_ACTION" ? "SUBMIT_ACTION" : "ADVANCE_TURN"
  };
};

export const matchApi = {
  async createMatch(homeTeamName: string, awayTeamName: string): Promise<MatchStateView> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>("/matches", {
      method: "POST",
      body: JSON.stringify({ homeTeamName, awayTeamName })
    });

    return extractMatchState(payload);
  },

  async getMatchState(matchId: string, userId?: string): Promise<MatchStateView> {
    const search = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const payload = await request<ApiResponse<{ matchState: MatchStateView }>>(
      `/matches/${matchId}/state${search}`
    );

    return extractMatchState(payload);
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

    const data = asRecord(asRecord(payload).data);

    return {
      matchState: normalizeMatchState(data.matchState),
      cycle: normalizeCycle(data.cycle)
    };
  },

  async advanceTurn(matchId: string): Promise<{ matchState: MatchStateView; cycle: TurnCycle }> {
    const payload = await request<ApiResponse<{ matchState: MatchStateView; cycle: TurnCycle }>>(
      `/matches/${matchId}/advance`,
      {
        method: "POST"
      }
    );

    const data = asRecord(asRecord(payload).data);

    return {
      matchState: normalizeMatchState(data.matchState),
      cycle: normalizeCycle(data.cycle)
    };
  },

  async joinMatch(matchId: string): Promise<MatchJoinView> {
    const payload = await request<ApiResponse<{ user: MatchJoinView }>>(`/matches/${matchId}/join`, {
      method: "POST"
    });

    const user = asRecord(asRecord(payload).data).user;
    const parsedUser = asRecord(user);

    return {
      userId: typeof parsedUser.userId === "string" ? parsedUser.userId : "",
      displayName: typeof parsedUser.displayName === "string" ? parsedUser.displayName : "Jogador"
    };
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

    return extractMatchState(payload);
  }
};
