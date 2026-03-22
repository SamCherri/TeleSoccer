import { MatchLineupPlayer, MatchSummary, MatchVisualEvent, MatchVisualFrame, MatchVisualFramePhase, MatchVisualPlayerSnapshot, MatchVisualSequence } from './types';

const clonePlayers = (lineups: MatchLineupPlayer[]): MatchVisualPlayerSnapshot[] =>
  lineups.map((lineup) => ({
    id: lineup.id,
    side: lineup.side,
    role: lineup.role,
    shirtNumber: lineup.shirtNumber,
    label: lineup.displayName,
    x: lineup.tacticalPosition.x,
    y: lineup.tacticalPosition.y,
    isUserControlled: lineup.isUserControlled
  }));

const phaseOrder = (event: MatchVisualEvent): MatchVisualFramePhase[] => {
  switch (event.sceneKey) {
    case 'pass-received': return ['START', 'END'];
    case 'pass-intercepted': return ['START', 'DUEL', 'END'];
    case 'dribble': return ['START', 'DUEL', 'ACTION', 'END'];
    case 'shot':
    case 'goalkeeper-save':
    case 'goal':
    case 'corner-kick':
    case 'penalty-kick':
      return ['START', 'ACTION', 'END'];
    case 'rebound':
      return ['START', 'ACTION', 'END'];
    default:
      return ['START', 'END'];
  }
};

const narrationForPhase = (event: MatchVisualEvent, phase: MatchVisualFramePhase): string => {
  if (phase === 'START') return event.narration.start;
  if (phase === 'DUEL') return event.narration.duel ?? event.narration.action;
  if (phase === 'ACTION') return event.narration.action;
  return event.narration.end;
};

const findPlayer = (players: MatchVisualPlayerSnapshot[], id: string | undefined) => (id ? players.find((player) => player.id === id) : undefined);

const setPlayerPosition = (players: MatchVisualPlayerSnapshot[], lineupId: string | undefined, x: number, y: number, extras: Partial<MatchVisualPlayerSnapshot> = {}) => {
  if (!lineupId) return;
  const player = findPlayer(players, lineupId);
  if (!player) return;
  player.x = x;
  player.y = y;
  Object.assign(player, extras);
};

const applyPhase = (players: MatchVisualPlayerSnapshot[], event: MatchVisualEvent, phase: MatchVisualFramePhase) => {
  const actor = event.actor;
  const marker = event.marker;
  const receiver = event.receiver;
  const primaryTarget = event.primaryTarget;
  const ownerId = phase === 'END' ? (event.possessionAfter === event.actor.side ? actor.lineupId : primaryTarget?.lineupId ?? marker?.lineupId ?? actor.lineupId) : actor.lineupId;

  if (phase === 'START') {
    setPlayerPosition(players, actor.lineupId, event.origin.x, event.origin.y, { hasBall: true, isPrimaryActor: true });
    if (marker) setPlayerPosition(players, marker.lineupId, marker.side === actor.side ? event.origin.x : event.origin.x + (marker.side === 'HOME' ? 4 : -4), event.origin.y + 6, { isPrimaryTarget: true });
  }
  if (phase === 'DUEL' && marker) {
    setPlayerPosition(players, actor.lineupId, (event.origin.x + event.destination.x) / 2, (event.origin.y + event.destination.y) / 2, { hasBall: true, isPrimaryActor: true });
    setPlayerPosition(players, marker.lineupId, (event.origin.x + event.destination.x) / 2 + (marker.side === 'HOME' ? 3 : -3), (event.origin.y + event.destination.y) / 2 + 4, { isPrimaryTarget: true });
  }
  if (phase === 'ACTION') {
    setPlayerPosition(players, actor.lineupId, event.destination.x, event.destination.y, { hasBall: event.possessionAfter === actor.side, isPrimaryActor: true });
    if (receiver) setPlayerPosition(players, receiver.lineupId, event.ballTarget.x, event.ballTarget.y - 2, { hasBall: event.possessionAfter === receiver.side });
    if (marker) setPlayerPosition(players, marker.lineupId, event.ballTarget.x + (marker.side === 'HOME' ? 2 : -2), event.ballTarget.y + 3, { isPrimaryTarget: true });
  }
  if (phase === 'END') {
    setPlayerPosition(players, actor.lineupId, event.destination.x, event.destination.y, { hasBall: ownerId === actor.lineupId, isPrimaryActor: true });
    if (receiver) setPlayerPosition(players, receiver.lineupId, event.ballTarget.x, event.ballTarget.y, { hasBall: ownerId === receiver.lineupId });
    if (marker) setPlayerPosition(players, marker.lineupId, event.ballTarget.x, event.ballTarget.y + 2, { hasBall: ownerId === marker.lineupId, isPrimaryTarget: true });
    if (primaryTarget) setPlayerPosition(players, primaryTarget.lineupId, event.ballTarget.x, event.ballTarget.y + 2, { hasBall: ownerId === primaryTarget.lineupId, isPrimaryTarget: true });
  }

  const owner = findPlayer(players, ownerId);
  return {
    owner,
    ball: phase === 'START' ? event.origin : phase === 'DUEL' ? { x: (event.origin.x + event.destination.x) / 2, y: (event.origin.y + event.destination.y) / 2 } : event.ballTarget
  };
};

export const buildMatchVisualSequence = (match: MatchSummary): MatchVisualSequence | undefined => {
  const event = match.activeTurn?.visualEvent;
  if (!event || match.lineups.length === 0) return undefined;

  const frames = phaseOrder(event).map((phase, index) => {
    const players = clonePlayers(match.lineups);
    const state = applyPhase(players, event, phase);

    return {
      id: `${event.sequence}-${phase.toLowerCase()}-${index + 1}`,
      phase,
      sequence: event.sequence,
      minute: match.activeTurn?.minute ?? match.scoreboard.minute,
      narration: narrationForPhase(event, phase),
      sceneKey: event.sceneKey,
      ball: { x: state.ball.x, y: state.ball.y, ownerPlayerId: state.owner?.id, possessionSide: phase === 'END' ? event.possessionAfter : event.possessionBefore },
      possessionSide: phase === 'END' ? event.possessionAfter : event.possessionBefore,
      ownerPlayerId: state.owner?.id,
      ownerLabel: state.owner?.label,
      players
    } satisfies MatchVisualFrame;
  });

  return {
    sequence: event.sequence,
    sceneKey: event.sceneKey,
    headline: event.headline,
    frameCount: frames.length,
    frames
  };
};
