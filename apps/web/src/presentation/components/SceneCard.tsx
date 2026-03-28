import type { MatchEventView } from "../../shared/types/match";

type SceneCardProps = {
  event?: MatchEventView | null;
};

const fallbackEvent: MatchEventView = {
  id: "fallback-event",
  label: "Lance em preparação",
  minute: 0,
  narrativeText: "Sem narrativa disponível.",
  visualPayload: {
    frameType: "TACTICAL_MAP",
    sceneKey: "fallback-scene",
    zone: "MIDFIELD",
    assetPath: ""
  }
};

export function SceneCard({ event }: SceneCardProps) {
  const safeEvent = event ?? fallbackEvent;

  return (
    <article
      style={{
        background: "#09243a",
        borderRadius: 12,
        border: "1px solid #2b4b68",
        padding: 12,
        display: "grid",
        gap: 8
      }}
    >
      <div
        style={{
          height: 190,
          borderRadius: 10,
          border: "1px solid #355c7a",
          background: "linear-gradient(180deg, #113b5d 0%, #0d2f4c 100%)",
          display: "grid",
          placeItems: "center"
        }}
      >
        <span style={{ opacity: 0.9 }}>Cena: {safeEvent.visualPayload.sceneKey}</span>
      </div>
      <strong>{safeEvent.label}</strong>
      <p style={{ margin: 0 }}>{safeEvent.narrativeText}</p>
    </article>
  );
}
