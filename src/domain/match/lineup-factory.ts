import { MatchLineupPlayer, MatchPossessionSide, MatchVisualCoordinate, MatchVisualPlayerRole } from './types';
import { MatchPlayerProfile } from './repository';

const tacticalPositions: Record<MatchPossessionSide, Array<{ role: MatchVisualPlayerRole; position: MatchVisualCoordinate }>> = {
  [MatchPossessionSide.Home]: [
    { role: 'GOALKEEPER', position: { x: 8, y: 50 } },
    { role: 'DEFENDER', position: { x: 18, y: 18 } },
    { role: 'DEFENDER', position: { x: 21, y: 38 } },
    { role: 'DEFENDER', position: { x: 21, y: 62 } },
    { role: 'DEFENDER', position: { x: 18, y: 82 } },
    { role: 'MIDFIELDER', position: { x: 38, y: 18 } },
    { role: 'MIDFIELDER', position: { x: 42, y: 36 } },
    { role: 'MIDFIELDER', position: { x: 44, y: 50 } },
    { role: 'MIDFIELDER', position: { x: 42, y: 64 } },
    { role: 'FORWARD', position: { x: 60, y: 36 } },
    { role: 'FORWARD', position: { x: 63, y: 66 } }
  ],
  [MatchPossessionSide.Away]: [
    { role: 'GOALKEEPER', position: { x: 92, y: 50 } },
    { role: 'DEFENDER', position: { x: 82, y: 18 } },
    { role: 'DEFENDER', position: { x: 79, y: 38 } },
    { role: 'DEFENDER', position: { x: 79, y: 62 } },
    { role: 'DEFENDER', position: { x: 82, y: 82 } },
    { role: 'MIDFIELDER', position: { x: 62, y: 18 } },
    { role: 'MIDFIELDER', position: { x: 58, y: 36 } },
    { role: 'MIDFIELDER', position: { x: 56, y: 50 } },
    { role: 'MIDFIELDER', position: { x: 58, y: 64 } },
    { role: 'FORWARD', position: { x: 40, y: 36 } },
    { role: 'FORWARD', position: { x: 37, y: 66 } }
  ]
};

const homeNamePool = ['Mateus', 'Bruno', 'Rafael', 'Caio', 'Pedro', 'João', 'Tiago', 'André', 'Lucas', 'Enzo'];
const awayNamePool = ['Samuel', 'Diego', 'Victor', 'Natan', 'Hector', 'Pablo', 'Felipe', 'Leandro', 'Iago', 'Davi'];
const surnames = ['Silva', 'Costa', 'Souza', 'Rocha', 'Moura', 'Oliveira', 'Santos', 'Lima', 'Barbosa', 'Teixeira'];

const buildName = (side: MatchPossessionSide, index: number): string => {
  const first = (side === MatchPossessionSide.Home ? homeNamePool : awayNamePool)[index % 10];
  const last = surnames[(index * 3 + (side === MatchPossessionSide.Home ? 1 : 5)) % 10];
  return `${first} ${last}`;
};

const normalizeRoleFromPosition = (position: string): MatchVisualPlayerRole => {
  if (position === 'GOALKEEPER') return 'GOALKEEPER';
  if (position === 'DEFENDER') return 'DEFENDER';
  if (position === 'MIDFIELDER') return 'MIDFIELDER';
  return 'FORWARD';
};

export const buildDefaultMatchLineups = (player: MatchPlayerProfile): MatchLineupPlayer[] => {
  const home = tacticalPositions[MatchPossessionSide.Home].map((slot, index) => ({
    id: `home-lineup-${index + 1}`,
    side: MatchPossessionSide.Home,
    role: slot.role,
    displayName: buildName(MatchPossessionSide.Home, index),
    shirtNumber: index + 1,
    isUserControlled: false,
    tacticalPosition: slot.position
  }));

  const away = tacticalPositions[MatchPossessionSide.Away].map((slot, index) => ({
    id: `away-lineup-${index + 1}`,
    side: MatchPossessionSide.Away,
    role: slot.role,
    displayName: buildName(MatchPossessionSide.Away, index),
    shirtNumber: index + 1,
    isUserControlled: false,
    tacticalPosition: slot.position
  }));

  const userRole = normalizeRoleFromPosition(player.position);
  const userSlotIndex = home.findIndex((entry) => entry.role === userRole);
  home[userSlotIndex >= 0 ? userSlotIndex : 9] = {
    ...home[userSlotIndex >= 0 ? userSlotIndex : 9],
    id: `player-${player.playerId}`,
    displayName: player.playerName,
    isUserControlled: true
  };

  return [...home, ...away];
};

export const getTacticalPositionForSideAndShirt = (side: MatchPossessionSide, shirtNumber: number): MatchVisualCoordinate => tacticalPositions[side][Math.max(0, Math.min(tacticalPositions[side].length - 1, shirtNumber - 1))].position;
