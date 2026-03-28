import type { PlayerActionIntent } from "../../shared/types/match";

type ActionPanelProps = {
  actions?: PlayerActionIntent[];
  disabled?: boolean;
  onAction: (action: PlayerActionIntent) => void;
};

const labels: Record<PlayerActionIntent, string> = {
  PASS: "Passar",
  DRIBBLE: "Driblar",
  SHOT: "Chutar",
  PROTECT_BALL: "Proteger bola",
  PASS_BACK: "Tocar para trás",
  SWITCH_PLAY: "Inverter jogada"
};

export function ActionPanel({ actions = [], disabled = false, onAction }: ActionPanelProps) {
  const safeActions = Array.isArray(actions) ? actions : [];

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Ações disponíveis</h2>
      {safeActions.length === 0 ? (
        <p style={{ margin: 0, opacity: 0.85 }}>Sem ação manual neste turno.</p>
      ) : (
        safeActions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => onAction(action)}
            style={{
              width: "100%",
              textAlign: "left",
              borderRadius: 10,
              border: "1px solid #3a678f",
              background: "#0b2f4b",
              color: "#f2f6fa",
              padding: "10px 12px",
              fontSize: 14,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.65 : 1
            }}
          >
            {labels[action]}
          </button>
        ))
      )}
    </section>
  );
}
