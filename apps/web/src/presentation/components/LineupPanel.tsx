import type { MatchLineupSlotView } from "../../shared/types/match";

type LineupPanelProps = {
  lineup?: MatchLineupSlotView[];
  canClaim: boolean;
  isLoading: boolean;
  onClaim: (teamSide: "HOME" | "AWAY", slotNumber: number) => void;
};

const sectionStyle = {
  display: "grid",
  gap: 8
} as const;

const sideTitle: Record<"HOME" | "AWAY", string> = {
  HOME: "Titulares HOME",
  AWAY: "Titulares AWAY"
};

export function LineupPanel({ lineup = [], canClaim, isLoading, onClaim }: LineupPanelProps) {
  const safeLineup = Array.isArray(lineup) ? lineup : [];
  const homeSlots = safeLineup
    .filter((slot) => slot.teamSide === "HOME")
    .sort((a, b) => a.slotNumber - b.slotNumber);
  const awaySlots = safeLineup
    .filter((slot) => slot.teamSide === "AWAY")
    .sort((a, b) => a.slotNumber - b.slotNumber);

  const renderTeamSlots = (teamSide: "HOME" | "AWAY", slots: MatchLineupSlotView[]) => (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{sideTitle[teamSide]}</h2>
      {slots.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Sem vagas carregadas para este time.</p>
      ) : (
        slots.map((slot) => {
          const isHuman = slot.controlMode === "HUMAN";
          return (
            <article
              key={`${teamSide}-${slot.slotNumber}`}
              style={{
                border: "1px solid #3a678f",
                borderRadius: 10,
                background: "#0b2f4b",
                padding: 10,
                display: "grid",
                gap: 6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 14 }}>
                  #{slot.slotNumber} {slot.playerName}
                </strong>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 6px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: isHuman ? "#2fd17b" : "#7fb5de",
                    color: isHuman ? "#2fd17b" : "#9ec8e8"
                  }}
                >
                  {slot.controlMode}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
                {slot.position}
                {slot.isCaptain ? " · Capitão" : ""}
              </p>

              <button
                type="button"
                disabled={!canClaim || isLoading || isHuman}
                onClick={() => onClaim(teamSide, slot.slotNumber)}
                style={{
                  borderRadius: 8,
                  border: "1px solid #5aa3d6",
                  background: isHuman ? "#1f4f3a" : "#14517c",
                  color: "#fff",
                  padding: "8px 10px",
                  fontSize: 13,
                  cursor: !canClaim || isLoading || isHuman ? "not-allowed" : "pointer",
                  opacity: !canClaim || isLoading || isHuman ? 0.65 : 1
                }}
              >
                {isHuman ? "Vaga ocupada" : "Assumir vaga"}
              </button>
            </article>
          );
        })
      )}
    </section>
  );

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {renderTeamSlots("HOME", homeSlots)}
      {renderTeamSlots("AWAY", awaySlots)}
    </section>
  );
}
