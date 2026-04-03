import type { MatchState } from '../../shared/types/match.js';

const API_URL = import.meta.env.VITE_API_URL;

export async function startMatch(): Promise<MatchState> {
  const response = await fetch(`${API_URL}/matches/start`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Falha ao iniciar partida.');
  }

  const data = (await response.json()) as { match: MatchState };
  return data.match;
}
