import type {
  MatchStateView,
  PlayerActionIntent,
  TurnAdvanceResponse
} from "../../shared/contracts/match-contracts.js";
import {
  applyCanonicalEventToState,
  buildCanonicalEventFromAction
} from "../engine/canonical-event.js";
import { advanceZoneOnSuccess, fallbackZoneOnFailure } from "../engine/field-zone.js";
import { resolveActionSuccess } from "../engine/action-resolution.js";
import { buildEngineContext, resolveTurnTransition } from "../engine/turn-transition.js";

export const resolveCycle = (
  state: MatchStateView
): TurnAdvanceResponse["cycle"] => {
  if (state.minute >= 90) {
    return {
      mode: "AUTO",
      reason: "match-ended",
      nextExpectedAction: "ADVANCE_TURN"
    };
  }

  if (state.turnResolutionMode === "REQUIRES_PLAYER_ACTION") {
    return {
      mode: "REQUIRES_PLAYER_ACTION",
      reason: "action-required",
      nextExpectedAction: "SUBMIT_ACTION"
    };
  }

  return {
    mode: "AUTO",
    reason: "auto-step",
    nextExpectedAction: "ADVANCE_TURN"
  };
};

export const resolveInteractiveActionDomain = (
  state: MatchStateView,
  action: PlayerActionIntent
): {
  minute: number;
  turnNumber: number;
  turnResolutionMode: MatchStateView["turnResolutionMode"];
  availableActions: PlayerActionIntent[];
  event: MatchStateView["currentEvent"];
  nextPossessionTeamSide: MatchStateView["possessionTeamSide"];
} => {
  const context = buildEngineContext(state);
  const success = resolveActionSuccess({ ...context, action });
  const nextZone = success
    ? advanceZoneOnSuccess(context.currentZone, action)
    : fallbackZoneOnFailure(context.currentZone);

  const canonicalEvent = buildCanonicalEventFromAction(context, action, success, nextZone);

  return {
    minute: state.minute,
    turnNumber: state.turnNumber,
    turnResolutionMode: "AUTO",
    availableActions: [],
    event: applyCanonicalEventToState(state, canonicalEvent, state.minute),
    nextPossessionTeamSide: canonicalEvent.nextPossessionTeamSide
  };
};

export const resolveAdvanceTurnDomain = (
  state: MatchStateView
): {
  minute: number;
  turnNumber: number;
  turnResolutionMode: MatchStateView["turnResolutionMode"];
  availableActions: PlayerActionIntent[];
  event: MatchStateView["currentEvent"];
  nextPossessionTeamSide: MatchStateView["possessionTeamSide"];
} => {
  const context = buildEngineContext(state);
  const transition = resolveTurnTransition(context);

  return {
    minute: transition.nextMinute,
    turnNumber: transition.nextTurnNumber,
    turnResolutionMode: transition.nextTurnResolutionMode,
    availableActions: transition.nextAvailableActions,
    event: applyCanonicalEventToState(state, transition.event, transition.nextMinute),
    nextPossessionTeamSide: transition.event.nextPossessionTeamSide
  };
};
