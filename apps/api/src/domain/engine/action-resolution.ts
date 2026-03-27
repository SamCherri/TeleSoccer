import type { MatchZone, PlayerActionIntent } from "../../shared/contracts/match-contracts.js";
import type { ActionResolutionInput } from "./match-engine-types.js";

const actionBaseSuccess: Record<PlayerActionIntent, number> = {
  PASS: 0.74,
  DRIBBLE: 0.55,
  SHOT: 0.38,
  PROTECT_BALL: 0.67,
  PASS_BACK: 0.83,
  SWITCH_PLAY: 0.62
};

const zoneModifierByAction: Record<PlayerActionIntent, Partial<Record<MatchZone, number>>> = {
  PASS: {
    MIDDLE_THIRD: 0.06,
    ATTACKING_THIRD: -0.03
  },
  DRIBBLE: {
    WING_LEFT: 0.08,
    WING_RIGHT: 0.08,
    PENALTY_BOX: -0.08
  },
  SHOT: {
    PENALTY_BOX: 0.22,
    ATTACKING_THIRD: 0.08,
    MIDDLE_THIRD: -0.25
  },
  PROTECT_BALL: {
    DEFENSIVE_THIRD: 0.07,
    MIDDLE_THIRD: 0.04
  },
  PASS_BACK: {
    DEFENSIVE_THIRD: 0.05,
    PENALTY_BOX: -0.12
  },
  SWITCH_PLAY: {
    WING_LEFT: 0.05,
    WING_RIGHT: 0.05,
    CENTER_CHANNEL: 0.02
  }
};

const buildDeterministicRoll = ({ turnNumber, minute, action }: ActionResolutionInput): number => {
  const seedText = `${turnNumber}-${minute}-${action}`;
  let hash = 0;
  for (const char of seedText) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  }
  return hash / 10000;
};

export const resolveActionSuccess = (input: ActionResolutionInput): boolean => {
  const base = actionBaseSuccess[input.action];
  const zoneModifier = zoneModifierByAction[input.action][input.currentZone] ?? 0;
  const threshold = Math.max(0.1, Math.min(0.92, base + zoneModifier));
  const roll = buildDeterministicRoll(input);

  return roll <= threshold;
};
