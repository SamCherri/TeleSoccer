import type { MatchZone, PlayerActionIntent } from "../../shared/contracts/match-contracts.js";

const attackFlow: MatchZone[] = [
  "DEFENSIVE_THIRD",
  "MIDDLE_THIRD",
  "ATTACKING_THIRD",
  "PENALTY_BOX"
];

const retreatFlow: MatchZone[] = [
  "PENALTY_BOX",
  "ATTACKING_THIRD",
  "MIDDLE_THIRD",
  "DEFENSIVE_THIRD"
];

const nextInFlow = (flow: MatchZone[], zone: MatchZone): MatchZone => {
  const index = flow.indexOf(zone);
  if (index < 0 || index === flow.length - 1) {
    return flow[flow.length - 1] ?? zone;
  }
  return flow[index + 1] ?? zone;
};

export const advanceZoneOnSuccess = (currentZone: MatchZone, action: PlayerActionIntent): MatchZone => {
  if (action === "SWITCH_PLAY") {
    return currentZone === "WING_LEFT" ? "WING_RIGHT" : "WING_LEFT";
  }

  if (action === "PASS_BACK") {
    return nextInFlow(retreatFlow, currentZone);
  }

  if (action === "PROTECT_BALL") {
    return currentZone;
  }

  if (currentZone === "WING_LEFT" || currentZone === "WING_RIGHT") {
    return "ATTACKING_THIRD";
  }

  return nextInFlow(attackFlow, currentZone);
};

export const fallbackZoneOnFailure = (currentZone: MatchZone): MatchZone => {
  if (currentZone === "PENALTY_BOX") {
    return "ATTACKING_THIRD";
  }

  if (currentZone === "ATTACKING_THIRD") {
    return "MIDDLE_THIRD";
  }

  return currentZone;
};
