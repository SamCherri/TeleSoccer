import { AttributeKey, PlayerPosition } from '../shared/enums';
import { PlayerAttributes } from './types';

const allAttributes: AttributeKey[] = [
  AttributeKey.Reflexes,
  AttributeKey.Handling,
  AttributeKey.Kicking,
  AttributeKey.Positioning,
  AttributeKey.Passing,
  AttributeKey.Shooting,
  AttributeKey.Dribbling,
  AttributeKey.Speed,
  AttributeKey.Marking
];

const positionBase: Record<PlayerPosition, Partial<PlayerAttributes>> = {
  [PlayerPosition.Goalkeeper]: {
    [AttributeKey.Reflexes]: 36,
    [AttributeKey.Handling]: 35,
    [AttributeKey.Kicking]: 28,
    [AttributeKey.Positioning]: 34,
    [AttributeKey.Passing]: 20,
    [AttributeKey.Shooting]: 16,
    [AttributeKey.Dribbling]: 18,
    [AttributeKey.Speed]: 20,
    [AttributeKey.Marking]: 18
  },
  [PlayerPosition.Defender]: {
    [AttributeKey.Reflexes]: 18,
    [AttributeKey.Handling]: 16,
    [AttributeKey.Kicking]: 24,
    [AttributeKey.Positioning]: 25,
    [AttributeKey.Passing]: 24,
    [AttributeKey.Shooting]: 18,
    [AttributeKey.Dribbling]: 20,
    [AttributeKey.Speed]: 23,
    [AttributeKey.Marking]: 34
  },
  [PlayerPosition.Midfielder]: {
    [AttributeKey.Reflexes]: 16,
    [AttributeKey.Handling]: 14,
    [AttributeKey.Kicking]: 22,
    [AttributeKey.Positioning]: 24,
    [AttributeKey.Passing]: 34,
    [AttributeKey.Shooting]: 24,
    [AttributeKey.Dribbling]: 31,
    [AttributeKey.Speed]: 24,
    [AttributeKey.Marking]: 22
  },
  [PlayerPosition.Forward]: {
    [AttributeKey.Reflexes]: 14,
    [AttributeKey.Handling]: 12,
    [AttributeKey.Kicking]: 24,
    [AttributeKey.Positioning]: 23,
    [AttributeKey.Passing]: 24,
    [AttributeKey.Shooting]: 35,
    [AttributeKey.Dribbling]: 30,
    [AttributeKey.Speed]: 28,
    [AttributeKey.Marking]: 18
  }
};

export const calculateInitialAttributes = (position: PlayerPosition, heightCm: number, weightKg: number): PlayerAttributes => {
  const attributes = Object.fromEntries(
    allAttributes.map((key) => [key, positionBase[position][key] ?? 18])
  ) as PlayerAttributes;

  const heightDelta = heightCm >= 188 ? 3 : heightCm <= 168 ? -2 : 0;
  const weightDelta = weightKg >= 82 ? 2 : weightKg <= 62 ? -1 : 0;

  if (position === PlayerPosition.Goalkeeper) {
    attributes[AttributeKey.Reflexes] += 1;
    attributes[AttributeKey.Handling] += Math.max(0, heightDelta);
    attributes[AttributeKey.Positioning] += Math.max(0, heightDelta);
    attributes[AttributeKey.Speed] += Math.min(0, weightDelta);
  } else {
    attributes[AttributeKey.Speed] += Math.min(2, Math.max(-2, -heightDelta - weightDelta));
    attributes[AttributeKey.Marking] += position === PlayerPosition.Defender ? Math.max(0, weightDelta) : 0;
    attributes[AttributeKey.Dribbling] += position === PlayerPosition.Midfielder || position === PlayerPosition.Forward ? Math.max(0, -weightDelta) : 0;
    attributes[AttributeKey.Shooting] += position === PlayerPosition.Forward ? Math.max(0, -heightDelta) : 0;
  }

  return attributes;
};
