import type { TeamSide } from "../../shared/types/match";

type PossessionIndicatorProps = {
  side: TeamSide;
};

export function PossessionIndicator({ side }: PossessionIndicatorProps): JSX.Element {
  return (
    <div
      style={{
        border: "1px solid #355c7a",
        borderRadius: 10,
        padding: "8px 10px",
        background: "#0f3555"
      }}
    >
      Posse atual: <strong>{side === "HOME" ? "Mandante" : "Visitante"}</strong>
    </div>
  );
}
