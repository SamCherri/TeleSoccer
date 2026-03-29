import type { ApiResponse, AuthSessionView, AuthUserView } from "../../shared/types/match";

const REQUEST_TIMEOUT_MS = 12_000;

const resolveApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }

  throw new Error("VITE_API_URL não configurada no frontend de produção.");
};

const apiBaseUrl = resolveApiBaseUrl();

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      },
      ...init,
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as { data?: { error?: string } };
        if (parsed.data?.error) {
          throw new Error(parsed.data.error);
        }
      } catch {
        // fallback abaixo
      }

      throw new Error(`API ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Tempo limite excedido ao conectar com a API.");
    }

    if (error instanceof TypeError) {
      throw new Error("Não foi possível conectar à API de autenticação.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const authApi = {
  async register(input: { email: string; displayName: string; password: string }): Promise<AuthSessionView> {
    const payload = await request<ApiResponse<{ session: AuthSessionView }>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return payload.data.session;
  },

  async login(input: { email: string; password: string }): Promise<AuthSessionView> {
    const payload = await request<ApiResponse<{ session: AuthSessionView }>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return payload.data.session;
  },

  async me(token: string): Promise<AuthUserView> {
    const payload = await request<ApiResponse<{ user: AuthUserView }>>("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return payload.data.user;
  }
};
