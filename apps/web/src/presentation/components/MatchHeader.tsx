import type { MatchStateView } from "../../shared/types/match";

type MatchHeaderProps = {
  matchState: MatchStateView;
};

export function MatchHeader({ matchState }: MatchHeaderProps): JSX.Element {
  return (
    <header style={{ display: "grid", gap: 4 }}>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
        Minuto {matchState.minute} · Turno {matchState.turnNumber}
      </p>
      <h1 style={{ margin: 0, fontSize: 20 }}>
        {matchState.homeTeamName} {matchState.score.home} x {matchState.score.away} {matchState.awayTeamName}
      </h1>
    </header>
  );
}
