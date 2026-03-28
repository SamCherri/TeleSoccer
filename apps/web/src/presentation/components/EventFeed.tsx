import type { MatchEventView } from "../../shared/types/match";

type EventFeedProps = {
  events: MatchEventView[];
};

export function EventFeed({ events }: EventFeedProps) {
  const lastEvents = events.slice(-5).reverse();

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Feed de eventos</h2>
      {lastEvents.length === 0 ? (
        <p style={{ margin: 0, opacity: 0.8 }}>Sem eventos anteriores ainda.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
          {lastEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.minute}'</strong> · {event.label} — {event.narrativeText}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
