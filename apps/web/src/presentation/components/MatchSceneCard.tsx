import type { MatchState } from '../../shared/types/match.js';

interface MatchSceneCardProps {
  match: MatchState;
}

export function MatchSceneCard({ match }: MatchSceneCardProps) {
  return (
    <article style={{ border: '1px solid #d9d9d9', borderRadius: 12, padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>{match.homeScore} x {match.awayScore}</strong>
        <span>{match.minute}'</span>
      </header>
      <p style={{ margin: 0 }}>{match.sceneText}</p>
      <small>Posse: {match.possession === 'HOME' ? 'Casa' : 'Visitante'}</small>
    </article>
  );
}
