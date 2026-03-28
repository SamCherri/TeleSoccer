import { useEffect } from "react";
import { useMatchUiStore } from "../../state/match-ui-store";
import { ActionPanel } from "../components/ActionPanel";
import { EventFeed } from "../components/EventFeed";
import { LineupPanel } from "../components/LineupPanel";
import { MatchHeader } from "../components/MatchHeader";
import { PossessionIndicator } from "../components/PossessionIndicator";
import { SceneCard } from "../components/SceneCard";

export function MatchPage() {
  const {
    matchState,
    cycle,
    isLoading,
    errorMessage,
    userId,
    userDisplayName,
    bootstrapMatch,
    joinMatch,
    claimSlot,
    sendAction,
    advanceTurn
  } = useMatchUiStore();

  useEffect(() => {
    if (!matchState) {
      void bootstrapMatch();
    }
  }, [bootstrapMatch, matchState]);

  if (!matchState) {
    return (
      <main style={{ color: "#fff", padding: 16 }}>
        <p>{isLoading ? "Criando partida..." : "Inicializando partida."}</p>
        {errorMessage ? <p>Erro: {errorMessage}</p> : null}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "linear-gradient(180deg, #041423 0%, #0a2740 100%)",
        color: "#f2f6fa",
        padding: "16px"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          display: "grid",
          gap: 12,
          background: "#0f3555",
          borderRadius: 16,
          border: "1px solid #2f5c83",
          padding: 16,
          boxShadow: "0 16px 28px rgba(0, 0, 0, 0.25)"
        }}
      >
        <MatchHeader matchState={matchState} />
        <PossessionIndicator side={matchState.possessionTeamSide} />

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Controle de vagas</h2>
          <button
            type="button"
            onClick={() => {
              void joinMatch();
            }}
            disabled={isLoading}
            style={{
              borderRadius: 10,
              border: "1px solid #5aa3d6",
              background: "#14517c",
              color: "#fff",
              padding: "10px 12px",
              fontSize: 14,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.65 : 1
            }}
          >
            {userId ? `Conectado como ${userDisplayName ?? "Jogador"}` : "Entrar na partida"}
          </button>
        </section>

        <LineupPanel
          lineup={matchState.lineup}
          canClaim={Boolean(userId)}
          isLoading={isLoading}
          onClaim={(teamSide, slotNumber) => {
            void claimSlot(teamSide, slotNumber);
          }}
        />

        <SceneCard event={matchState.currentEvent} />
        <ActionPanel
          actions={matchState.availableActions}
          disabled={isLoading || matchState.turnResolutionMode !== "REQUIRES_PLAYER_ACTION"}
          onAction={(action) => {
            void sendAction(action);
          }}
        />

        <button
          type="button"
          onClick={() => {
            void advanceTurn();
          }}
          disabled={isLoading || cycle?.nextExpectedAction === "SUBMIT_ACTION"}
          style={{
            borderRadius: 10,
            border: "1px solid #5aa3d6",
            background: "#14517c",
            color: "#fff",
            padding: "10px 12px",
            fontSize: 14,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.65 : 1
          }}
        >
          Avançar turno
        </button>

        <EventFeed events={matchState.recentEvents} />
        {errorMessage ? <p style={{ margin: 0, color: "#ffd6d6" }}>Erro: {errorMessage}</p> : null}
      </section>
    </main>
  );
}
