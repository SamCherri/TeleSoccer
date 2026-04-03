import { useState } from 'react';
import { startMatch } from '../../infra/api/match-api.js';
import type { MatchState } from '../../shared/types/match.js';
import { MatchSceneCard } from '../components/MatchSceneCard.js';

export function MatchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);

  async function handleStartMatch() {
    setLoading(true);
    setError(null);

    try {
      const state = await startMatch();
      setMatch(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>TeleSoccer</h1>
      <button onClick={handleStartMatch} disabled={loading}>
        {loading ? 'Iniciando...' : 'Iniciar partida'}
      </button>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {match && <MatchSceneCard match={match} />}
    </main>
  );
}
