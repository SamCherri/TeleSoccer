import {
  MatchContextType,
  MatchEventType,
  MatchPossessionSide,
  MatchSceneKey,
  MatchSummary,
  MatchVisualBallSnapshot,
  MatchVisualFrame,
  MatchVisualFramePhase,
  MatchVisualPlayerSnapshot,
  MatchVisualSequence
} from './types';

interface BaseCoordinate {
  x: number;
  y: number;
}

interface VisualContext {
  sequence: number;
  minute: number;
  sceneKey: MatchSceneKey;
  possessionSide: MatchPossessionSide;
  narrationBase: string;
  confrontation: boolean;
  ownerLabel: string;
}

const formationBase: Record<MatchPossessionSide, Array<{ role: MatchVisualPlayerSnapshot['role']; x: number; y: number }>> = {
  [MatchPossessionSide.Home]: [
    { role: 'GOALKEEPER', x: 8, y: 50 },
    { role: 'DEFENDER', x: 18, y: 18 },
    { role: 'DEFENDER', x: 20, y: 38 },
    { role: 'DEFENDER', x: 20, y: 62 },
    { role: 'DEFENDER', x: 18, y: 82 },
    { role: 'MIDFIELDER', x: 38, y: 16 },
    { role: 'MIDFIELDER', x: 40, y: 36 },
    { role: 'MIDFIELDER', x: 42, y: 50 },
    { role: 'MIDFIELDER', x: 40, y: 64 },
    { role: 'FORWARD', x: 58, y: 34 },
    { role: 'FORWARD', x: 62, y: 66 }
  ],
  [MatchPossessionSide.Away]: [
    { role: 'GOALKEEPER', x: 92, y: 50 },
    { role: 'DEFENDER', x: 82, y: 18 },
    { role: 'DEFENDER', x: 80, y: 38 },
    { role: 'DEFENDER', x: 80, y: 62 },
    { role: 'DEFENDER', x: 82, y: 82 },
    { role: 'MIDFIELDER', x: 62, y: 16 },
    { role: 'MIDFIELDER', x: 60, y: 36 },
    { role: 'MIDFIELDER', x: 58, y: 50 },
    { role: 'MIDFIELDER', x: 60, y: 64 },
    { role: 'FORWARD', x: 42, y: 34 },
    { role: 'FORWARD', x: 38, y: 66 }
  ]
};

const includesAny = (value: string | undefined, fragments: string[]): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return fragments.some((fragment) => normalized.includes(fragment));
};

const pickSceneKey = (match: MatchSummary): MatchSceneKey => {
  const lastEvent = match.recentEvents[0];
  const previousOutcome = match.activeTurn?.previousOutcome;
  const contextType = match.activeTurn?.contextType;

  if (lastEvent?.type === MatchEventType.Goal) {
    return 'goal';
  }
  if (contextType === MatchContextType.PenaltyKick || includesAny(previousOutcome, ['pênalti', 'penalti'])) {
    return 'penalty-kick';
  }
  if (contextType === MatchContextType.CornerKick || lastEvent?.type === MatchEventType.CornerAwarded || includesAny(previousOutcome, ['escanteio'])) {
    return 'corner-kick';
  }
  if (contextType === MatchContextType.GoalkeeperSave || includesAny(previousOutcome, ['defender', 'espalmar', 'segurar', 'goleiro'])) {
    return 'goalkeeper-save';
  }
  if (contextType === MatchContextType.DefensiveDuel || includesAny(previousOutcome, ['dar bote', 'afastar', 'duelo', 'pressionado'])) {
    return 'defensive-duel';
  }
  if (includesAny(previousOutcome, ['rebote', 'sobrou dentro da área', 'segunda bola'])) {
    return 'rebound';
  }
  if (includesAny(previousOutcome, ['passar com sucesso', 'passe'])) {
    return includesAny(previousOutcome, ['não saiu como esperado', 'intercept']) ? 'pass-intercepted' : 'pass-received';
  }
  if (includesAny(previousOutcome, ['driblar', 'cortar'])) {
    return 'dribble';
  }
  if (includesAny(previousOutcome, ['finalizar', 'chute', 'shoot'])) {
    return 'shot';
  }
  if (contextType === MatchContextType.ReceivedFree) {
    return 'pass-received';
  }
  if (contextType === MatchContextType.ReceivedPressed || contextType === MatchContextType.BackToGoal) {
    return 'dribble';
  }
  if (contextType === MatchContextType.InBox || contextType === MatchContextType.FreeKick) {
    return 'shot';
  }

  return 'fallback';
};

const toDisplayName = (side: MatchPossessionSide, shirtNumber: number, role: MatchVisualPlayerSnapshot['role']) => {
  const prefix = side === MatchPossessionSide.Home ? 'H' : 'A';
  const roleInitial = role === 'GOALKEEPER' ? 'GK' : role === 'DEFENDER' ? 'D' : role === 'MIDFIELDER' ? 'M' : 'F';
  return `${prefix}${roleInitial}${shirtNumber}`;
};

const createBasePlayers = (side: MatchPossessionSide): MatchVisualPlayerSnapshot[] =>
  formationBase[side].map((slot, index) => ({
    id: `${side}-${index + 1}`,
    side,
    role: slot.role,
    shirtNumber: index + 1,
    label: toDisplayName(side, index + 1, slot.role),
    x: slot.x,
    y: slot.y
  }));

const getPrimaryActor = (players: MatchVisualPlayerSnapshot[], side: MatchPossessionSide): MatchVisualPlayerSnapshot => {
  if (side === MatchPossessionSide.Home) {
    return players.find((player) => player.side === side && player.role === 'MIDFIELDER' && player.shirtNumber === 7) ?? players[6];
  }

  return players.find((player) => player.side === side && player.role === 'MIDFIELDER' && player.shirtNumber === 7) ?? players[17];
};

const getNearestMarker = (players: MatchVisualPlayerSnapshot[], side: MatchPossessionSide, anchor: BaseCoordinate): MatchVisualPlayerSnapshot => {
  const candidates = players.filter((player) => player.side === side && player.role !== 'GOALKEEPER');
  return candidates.reduce((best, current) => {
    const bestDistance = Math.abs(best.x - anchor.x) + Math.abs(best.y - anchor.y);
    const currentDistance = Math.abs(current.x - anchor.x) + Math.abs(current.y - anchor.y);
    return currentDistance < bestDistance ? current : best;
  }, candidates[0]);
};

const sceneHeadline: Record<MatchSceneKey, string> = {
  'pass-received': 'Sequência de circulação curta',
  'pass-intercepted': 'Sequência de passe cortado',
  dribble: 'Sequência de drible e confronto',
  'defensive-duel': 'Sequência de duelo defensivo',
  shot: 'Sequência de finalização',
  'goalkeeper-save': 'Sequência de defesa do goleiro',
  goal: 'Sequência de gol',
  rebound: 'Sequência de rebote na área',
  'corner-kick': 'Sequência de escanteio',
  'penalty-kick': 'Sequência de pênalti',
  fallback: 'Sequência genérica de jogada'
};

const createNarration = (phase: MatchVisualFramePhase, context: VisualContext): string => {
  const opening = phase === 'START' ? 'Início' : phase === 'MIDDLE' ? 'Meio' : 'Fim';
  return `${opening}: ${context.narrationBase}`;
};

const moveCoordinate = (point: BaseCoordinate, delta: Partial<BaseCoordinate>): BaseCoordinate => ({
  x: Math.max(4, Math.min(96, point.x + (delta.x ?? 0))),
  y: Math.max(6, Math.min(94, point.y + (delta.y ?? 0)))
});

const buildFrame = (params: {
  phase: MatchVisualFramePhase;
  context: VisualContext;
  players: MatchVisualPlayerSnapshot[];
  actor: MatchVisualPlayerSnapshot;
  marker?: MatchVisualPlayerSnapshot;
}): MatchVisualFrame => {
  const { phase, context, players, actor, marker } = params;
  const actorDeltaMap: Record<MatchVisualFramePhase, Partial<BaseCoordinate>> = {
    START: context.possessionSide === MatchPossessionSide.Home ? { x: -2 } : { x: 2 },
    MIDDLE: context.possessionSide === MatchPossessionSide.Home ? { x: 5, y: context.sceneKey === 'dribble' ? -4 : 0 } : { x: -5, y: context.sceneKey === 'dribble' ? 4 : 0 },
    END:
      context.sceneKey === 'pass-intercepted'
        ? context.possessionSide === MatchPossessionSide.Home
          ? { x: 2, y: 2 }
          : { x: -2, y: -2 }
        : context.possessionSide === MatchPossessionSide.Home
          ? { x: 10, y: 0 }
          : { x: -10, y: 0 }
  };

  const markerDeltaMap: Record<MatchVisualFramePhase, Partial<BaseCoordinate>> = {
    START: {},
    MIDDLE: context.confrontation ? (context.possessionSide === MatchPossessionSide.Home ? { x: -4 } : { x: 4 }) : {},
    END:
      context.sceneKey === 'pass-intercepted'
        ? context.possessionSide === MatchPossessionSide.Home
          ? { x: -1, y: 1 }
          : { x: 1, y: -1 }
        : context.confrontation
          ? context.possessionSide === MatchPossessionSide.Home
            ? { x: -2, y: 1 }
            : { x: 2, y: -1 }
          : {}
  };

  const movedActor = { ...actor, ...moveCoordinate(actor, actorDeltaMap[phase]) };
  const movedMarker = marker ? { ...marker, ...moveCoordinate(marker, markerDeltaMap[phase]) } : undefined;
  const ownerPlayerId = context.sceneKey === 'pass-intercepted' && phase === 'END' && movedMarker ? movedMarker.id : actor.id;
  const ownerLabel = context.sceneKey === 'pass-intercepted' && phase === 'END' && movedMarker ? movedMarker.label : actor.label;
  const ball: MatchVisualBallSnapshot = {
    x: ownerPlayerId === actor.id ? movedActor.x + (context.possessionSide === MatchPossessionSide.Home ? 2 : -2) : movedMarker!.x,
    y: ownerPlayerId === actor.id ? movedActor.y : movedMarker!.y,
    ownerPlayerId,
    possessionSide: ownerPlayerId === actor.id ? context.possessionSide : context.possessionSide === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home
  };

  const framePlayers = players.map((player) => {
    if (player.id === actor.id) {
      return { ...player, ...movedActor, hasBall: ownerPlayerId === actor.id, isPrimaryActor: true, isUserControlled: player.side === MatchPossessionSide.Home };
    }
    if (movedMarker && player.id === movedMarker.id) {
      return { ...player, ...movedMarker, hasBall: ownerPlayerId === movedMarker.id, isPrimaryActor: context.sceneKey === 'pass-intercepted' && phase === 'END' };
    }
    return player;
  });

  return {
    id: `${context.sequence}-${phase.toLowerCase()}`,
    phase,
    sequence: context.sequence,
    minute: context.minute,
    narration: createNarration(phase, context),
    sceneKey: context.sceneKey,
    ball,
    possessionSide: ball.possessionSide,
    ownerPlayerId,
    ownerLabel,
    players: framePlayers
  };
};

export const buildMatchVisualSequence = (match: MatchSummary): MatchVisualSequence | undefined => {
  const turn = match.activeTurn;
  if (!turn) {
    return undefined;
  }

  const sceneKey = pickSceneKey(match);
  const players = [...createBasePlayers(MatchPossessionSide.Home), ...createBasePlayers(MatchPossessionSide.Away)];
  const actor = getPrimaryActor(players, turn.possessionSide);
  const marker = getNearestMarker(players, turn.possessionSide === MatchPossessionSide.Home ? MatchPossessionSide.Away : MatchPossessionSide.Home, actor);
  const confrontation = [
    MatchContextType.ReceivedPressed,
    MatchContextType.BackToGoal,
    MatchContextType.DefensiveDuel,
    MatchContextType.GoalkeeperSave,
    MatchContextType.InBox,
    MatchContextType.PenaltyKick
  ].includes(turn.contextType);

  const narrationBase = turn.previousOutcome ?? turn.contextText;
  const context: VisualContext = {
    sequence: turn.sequence,
    minute: turn.minute,
    sceneKey,
    possessionSide: turn.possessionSide,
    narrationBase,
    confrontation,
    ownerLabel: actor.label
  };

  const phases: MatchVisualFramePhase[] = confrontation || sceneKey === 'pass-intercepted' || sceneKey === 'goal' || sceneKey === 'goalkeeper-save' ? ['START', 'MIDDLE', 'END'] : ['START'];

  return {
    sequence: turn.sequence,
    sceneKey,
    headline: sceneHeadline[sceneKey],
    frames: phases.map((phase) => buildFrame({ phase, context, players, actor, marker }))
  };
};
