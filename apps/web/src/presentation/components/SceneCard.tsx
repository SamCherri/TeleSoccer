import type { MatchEventView } from "../../shared/types/match";

type SceneCardProps = {
  event: MatchEventView;
};

export function SceneCard({ event }: SceneCardProps) {
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
        <span style={{ opacity: 0.9 }}>Cena: {event.visualPayload.sceneKey}</span>
      </div>
      <strong>{event.label}</strong>
      <p style={{ margin: 0 }}>{event.narrativeText}</p>
    </article>
  );
}
