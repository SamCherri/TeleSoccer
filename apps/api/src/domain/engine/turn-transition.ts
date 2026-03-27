import type { MatchStateView, PlayerActionIntent } from "../../shared/contracts/match-contracts.js";
import { advanceZoneOnSuccess } from "./field-zone.js";
import { buildActionRequiredEvent, buildAutoProgressEvent } from "./canonical-event.js";
import type { EngineContext, TurnTransitionResult } from "./match-engine-types.js";

const interactiveActions: PlayerActionIntent[] = [
  "PASS",
  "DRIBBLE",
  "SHOT",
  "PROTECT_BALL",
  "PASS_BACK",
  "SWITCH_PLAY"
];

export const buildEngineContext = (state: MatchStateView): EngineContext => ({
  state,
  minute: state.minute,
  turnNumber: state.turnNumber,
  possessionTeamSide: state.possessionTeamSide,
  currentZone: state.currentEvent.visualPayload.zone
});

export const resolveTurnTransition = (context: EngineContext): TurnTransitionResult => {
  const nextMinute = Math.min(context.minute + 1, 90);
  const nextTurnNumber = context.turnNumber + 1;
  const isInteractiveTurn = nextMinute % 2 === 1;

  if (isInteractiveTurn) {
    return {
      nextMinute,
      nextTurnNumber,
      nextTurnResolutionMode: "REQUIRES_PLAYER_ACTION",
      nextAvailableActions: interactiveActions,
      event: buildActionRequiredEvent({ ...context, minute: nextMinute, turnNumber: nextTurnNumber })
    };
  }

  const nextZone = advanceZoneOnSuccess(context.currentZone, "PASS");
  return {
    nextMinute,
    nextTurnNumber,
    nextTurnResolutionMode: "AUTO",
    nextAvailableActions: [],
    event: buildAutoProgressEvent(
      { ...context, minute: nextMinute, turnNumber: nextTurnNumber },
      nextZone
    )
  };
};
