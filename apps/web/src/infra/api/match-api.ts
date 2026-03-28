import type { ApiResponse, MatchStateView, PlayerActionIntent, TurnCycle } from "../../shared/types/match";

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const resolveErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { data?: { error?: string | { message?: string } } };
    const error = payload?.data?.error;

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object" && error?.message) {
      return error.message;
    }
  }

  const fallbackText = await response.text();
  return fallbackText || response.statusText || "erro-desconhecido";
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json"
      },
      ...init
    });

    if (!response.ok) {
      const errorMessage = await resolveErrorMessage(response);
      throw new ApiRequestError(`API ${response.status}: ${errorMessage}`, response.status);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    throw new ApiRequestError(
      "Não foi possível conectar à API. Verifique a publicação do backend e o CORS.",
      undefined
    );
  }
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
