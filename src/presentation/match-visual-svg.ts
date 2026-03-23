import { buildMatchVisualSequence } from '../domain/match/visual-sequence';
import {
  MatchPossessionSide,
  MatchSceneKey,
  MatchSummary,
  MatchVisualActorRef,
  MatchVisualCoordinate,
  MatchVisualEvent,
  MatchVisualFrame,
  MatchVisualPlayerSnapshot
} from '../domain/match/types';

const viewBox = { width: 640, height: 360 } as const;
const palette = {
  sky: '#b8ecff',
  pitch: '#3f9b3a',
  pitchDark: '#2d7d2d',
  pitchLight: '#66b54f',
  stripe: 'rgba(255,255,255,0.10)',
  line: '#f6f4e8',
  panel: 'rgba(8, 26, 17, 0.78)',
  panelAccent: '#d9fbe8',
  text: '#ffffff',
  shadow: 'rgba(15, 23, 42, 0.24)',
  homePrimary: '#c0392b',
  homeAccent: '#ffd7cf',
  awayPrimary: '#1f5fbf',
  awayAccent: '#d3e6ff',
  goalkeeperPrimary: '#d99a00',
  goalkeeperAccent: '#ffe066',
  skin: '#f2d3ae',
  boot: '#1f2937',
  ball: '#ffffff',
  ballDetail: '#111827',
  actorGlow: '#fff3bf',
  targetGlow: '#ffd43b',
  guide: 'rgba(255,255,255,0.55)',
  goal: '#dfe7eb',
  net: '#f8f9fa',
  flag: '#ffd43b',
  flagAlt: '#ff8787',
  pixelOutline: '#2b1d16',
  userHalo: '#fff0a6'
} as const;

type Facing = 'left' | 'right';
type Tone = 'home' | 'away' | 'goalkeeper';
type VisualMode = 'tactical-map' | 'cinematic-duel';

type HeroEntityKind = 'actor' | 'marker' | 'receiver' | 'goalkeeper' | 'support';

interface HeroEntity {
  kind: HeroEntityKind;
  player: MatchVisualPlayerSnapshot;
  focus: 'actor' | 'target' | 'goalkeeper' | 'support';
}

interface SceneContext {
  event: MatchVisualEvent;
  frame: MatchVisualFrame;
  heroEntities: HeroEntity[];
  focusSide: MatchPossessionSide;
  attackDirection: Facing;
  ballStart: MatchVisualCoordinate;
  ballEnd: MatchVisualCoordinate;
  visualMode: VisualMode;
}

interface Camera {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Point {
  x: number;
  y: number;
}

const tacticalSceneKeys: MatchSceneKey[] = ['pass-received', 'pass-intercepted', 'fallback'];
const cinematicSceneKeys: MatchSceneKey[] = ['dribble', 'defensive-duel', 'shot', 'goalkeeper-save', 'goal', 'rebound', 'corner-kick', 'penalty-kick'];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const lerp = (start: number, end: number, weight: number) => start + (end - start) * weight;
const distance = (left: MatchVisualCoordinate, right: MatchVisualCoordinate) => Math.hypot(right.x - left.x, right.y - left.y);

const toneFor = (player: MatchVisualPlayerSnapshot): Tone =>
  player.role === 'GOALKEEPER' ? 'goalkeeper' : player.side === MatchPossessionSide.Home ? 'home' : 'away';

const colorsFor = (tone: Tone) => {
  if (tone === 'goalkeeper') return { primary: palette.goalkeeperPrimary, accent: palette.goalkeeperAccent };
  if (tone === 'away') return { primary: palette.awayPrimary, accent: palette.awayAccent };
  return { primary: palette.homePrimary, accent: palette.homeAccent };
};

const uniqueByPlayer = (entities: HeroEntity[]): HeroEntity[] => {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    if (seen.has(entity.player.id)) return false;
    seen.add(entity.player.id);
    return true;
  });
};

const facingFromDirection = (direction: Facing, player: MatchVisualPlayerSnapshot, anchorX: number): Facing => {
  if (Math.abs(player.x - anchorX) > 2) {
    return player.x < anchorX ? 'right' : 'left';
  }
  return direction;
};

const findPlayer = (frame: MatchVisualFrame, ref?: MatchVisualActorRef): MatchVisualPlayerSnapshot | undefined =>
  ref ? frame.players.find((player) => player.id === ref.lineupId) : undefined;

const resolveHeroEntities = (event: MatchVisualEvent, frame: MatchVisualFrame): HeroEntity[] => {
  const entities: HeroEntity[] = [];
  const actor = findPlayer(frame, event.actor);
  const marker = findPlayer(frame, event.marker ?? event.primaryTarget);
  const receiver = findPlayer(frame, event.receiver);
  const goalkeeper = findPlayer(frame, event.goalkeeper);

  if (actor) entities.push({ kind: 'actor', player: actor, focus: 'actor' });
  if (marker) entities.push({ kind: 'marker', player: marker, focus: 'target' });
  if (receiver) entities.push({ kind: 'receiver', player: receiver, focus: 'target' });
  if (goalkeeper) entities.push({ kind: 'goalkeeper', player: goalkeeper, focus: 'goalkeeper' });

  const supportPlayers = frame.players
    .filter((player) => !entities.some((entity) => entity.player.id === player.id))
    .filter((player) => Math.abs(player.x - event.ballTarget.x) <= 18 && Math.abs(player.y - event.ballTarget.y) <= 20)
    .slice(0, event.sceneKey === 'rebound' || event.sceneKey === 'corner-kick' ? 2 : 1)
    .map((player) => ({ kind: 'support' as const, player, focus: 'support' as const }));

  return uniqueByPlayer([...entities, ...supportPlayers]);
};

const resolveVisualMode = (sceneKey: MatchSceneKey): VisualMode =>
  tacticalSceneKeys.includes(sceneKey) ? 'tactical-map' : cinematicSceneKeys.includes(sceneKey) ? 'cinematic-duel' : 'tactical-map';

const buildCamera = (event: MatchVisualEvent, heroEntities: HeroEntity[], visualMode: VisualMode): Camera => {
  if (visualMode === 'tactical-map') {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  }

  const focusPoints: MatchVisualCoordinate[] = [event.origin, event.destination, event.ballTarget];
  heroEntities.forEach((entity) => focusPoints.push({ x: entity.player.x, y: entity.player.y }));

  const base = focusPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y)
    }),
    { minX: 100, maxX: 0, minY: 100, maxY: 0 }
  );

  const paddingByScene: Record<MatchSceneKey, { x: number; y: number; minWidth: number; minHeight: number }> = {
    'pass-received': { x: 12, y: 14, minWidth: 42, minHeight: 40 },
    'pass-intercepted': { x: 12, y: 16, minWidth: 42, minHeight: 42 },
    dribble: { x: 10, y: 16, minWidth: 36, minHeight: 38 },
    'defensive-duel': { x: 10, y: 16, minWidth: 34, minHeight: 36 },
    shot: { x: 16, y: 20, minWidth: 56, minHeight: 44 },
    'goalkeeper-save': { x: 16, y: 20, minWidth: 58, minHeight: 46 },
    goal: { x: 16, y: 20, minWidth: 60, minHeight: 46 },
    rebound: { x: 14, y: 20, minWidth: 50, minHeight: 44 },
    'corner-kick': { x: 18, y: 18, minWidth: 64, minHeight: 54 },
    'penalty-kick': { x: 18, y: 20, minWidth: 56, minHeight: 44 },
    fallback: { x: 18, y: 20, minWidth: 58, minHeight: 48 }
  };

  const settings = paddingByScene[event.sceneKey];
  let minX = base.minX - settings.x;
  let maxX = base.maxX + settings.x;
  let minY = base.minY - settings.y;
  let maxY = base.maxY + settings.y;

  if (maxX - minX < settings.minWidth) {
    const extra = (settings.minWidth - (maxX - minX)) / 2;
    minX -= extra;
    maxX += extra;
  }
  if (maxY - minY < settings.minHeight) {
    const extra = (settings.minHeight - (maxY - minY)) / 2;
    minY -= extra;
    maxY += extra;
  }

  minX = clamp(minX, 0, 100 - settings.minWidth);
  maxX = clamp(maxX, settings.minWidth, 100);
  minY = clamp(minY, 0, 100 - settings.minHeight);
  maxY = clamp(maxY, settings.minHeight, 100);

  return { minX, maxX, minY, maxY };
};

const toScenePoint = (camera: Camera, point: MatchVisualCoordinate): Point => {
  const width = Math.max(camera.maxX - camera.minX, 1);
  const height = Math.max(camera.maxY - camera.minY, 1);
  const x = 32 + ((point.x - camera.minX) / width) * 576;
  const y = 36 + ((point.y - camera.minY) / height) * 288;
  return { x: clamp(x, 24, 616), y: clamp(y, 30, 330) };
};

const renderDefs = () => `
  <defs>
    <linearGradient id="skyGradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.sky}" />
      <stop offset="44%" stop-color="#7cd4a2" />
      <stop offset="100%" stop-color="${palette.pitchDark}" />
    </linearGradient>
    <linearGradient id="pitchGradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.pitchLight}" />
      <stop offset="100%" stop-color="${palette.pitchDark}" />
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="rgba(15, 23, 42, 0.28)" />
    </filter>
  </defs>
`;

const renderBackdrop = () => `
  <rect width="${viewBox.width}" height="${viewBox.height}" rx="28" fill="url(#skyGradient)" />
  <rect y="146" width="${viewBox.width}" height="214" fill="url(#pitchGradient)" />
  ${[0, 1, 2, 3].map((index) => `<rect x="0" y="${156 + index * 44}" width="${viewBox.width}" height="22" fill="${palette.stripe}" />`).join('')}
`;

const renderStage = (camera: Camera, sceneKey: MatchSceneKey) => {
  const left = toScenePoint(camera, { x: camera.minX, y: camera.minY });
  const right = toScenePoint(camera, { x: camera.maxX, y: camera.maxY });
  const midfieldX = lerp(left.x, right.x, clamp((50 - camera.minX) / Math.max(camera.maxX - camera.minX, 1), 0, 1));
  const penaltyZoneLeft = toScenePoint(camera, { x: 12, y: 22 });
  const penaltyZoneRight = toScenePoint(camera, { x: 88, y: 78 });
  const centerY = (left.y + right.y) / 2;
  const stageWidth = right.x - left.x;
  const stageHeight = right.y - left.y;

  const penaltyLines =
    sceneKey === 'shot' || sceneKey === 'goalkeeper-save' || sceneKey === 'goal' || sceneKey === 'rebound' || sceneKey === 'penalty-kick' || sceneKey === 'corner-kick'
      ? `
        <rect x="${penaltyZoneRight.x - 92}" y="${penaltyZoneLeft.y + 20}" width="92" height="${Math.max(penaltyZoneRight.y - penaltyZoneLeft.y - 40, 44)}" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.65" />
        <rect x="${penaltyZoneRight.x - 38}" y="${centerY - 36}" width="38" height="72" fill="none" stroke="${palette.line}" stroke-width="2.5" opacity="0.65" />
      `
      : '';

  return `
    <g opacity="0.92">
      <rect x="${left.x}" y="${left.y}" width="${stageWidth}" height="${stageHeight}" rx="24" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.85" />
      <line x1="${midfieldX}" y1="${left.y}" x2="${midfieldX}" y2="${right.y}" stroke="${palette.line}" stroke-width="2" opacity="0.25" />
      ${penaltyLines}
    </g>
  `;
};

const renderGoal = (camera: Camera, side: Facing) => {
  const xField = side === 'right' ? camera.maxX - 1 : camera.minX + 1;
  const top = toScenePoint(camera, { x: xField, y: 34 });
  const bottom = toScenePoint(camera, { x: xField, y: 66 });
  const postX = side === 'right' ? top.x : top.x + 6;
  const netX = side === 'right' ? postX + 22 : postX - 22;
  const dir = side === 'right' ? 1 : -1;

  return `
    <g opacity="0.98" filter="url(#softShadow)">
      <line x1="${postX}" y1="${top.y}" x2="${postX}" y2="${bottom.y}" stroke="${palette.goal}" stroke-width="5" />
      <line x1="${postX}" y1="${top.y}" x2="${netX}" y2="${top.y + 10}" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${postX}" y1="${bottom.y}" x2="${netX}" y2="${bottom.y - 10}" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${netX}" y1="${top.y + 10}" x2="${netX}" y2="${bottom.y - 10}" stroke="${palette.goal}" stroke-width="4" />
      ${[0, 1, 2].map((index) => `<line x1="${postX + dir * (6 + index * 6)}" y1="${top.y + 2}" x2="${postX + dir * (6 + index * 6)}" y2="${bottom.y - 2}" stroke="${palette.net}" stroke-width="1.5" opacity="0.78" />`).join('')}
      ${[0, 1, 2].map((index) => `<line x1="${postX}" y1="${top.y + 8 + index * 12}" x2="${netX}" y2="${top.y + 12 + index * 8}" stroke="${palette.net}" stroke-width="1.2" opacity="0.7" />`).join('')}
    </g>
  `;
};

const renderCornerFlag = (point: Point) => `
  <g filter="url(#softShadow)">
    <line x1="${point.x}" y1="${point.y + 34}" x2="${point.x}" y2="${point.y - 30}" stroke="#f8f9fa" stroke-width="4" />
    <path d="M ${point.x} ${point.y - 28} L ${point.x + 24} ${point.y - 20} L ${point.x} ${point.y - 10} z" fill="${palette.flag}" />
    <path d="M ${point.x + 4} ${point.y - 24} L ${point.x + 20} ${point.y - 20} L ${point.x + 4} ${point.y - 14} z" fill="${palette.flagAlt}" opacity="0.86" />
  </g>
`;

const renderActionTrail = (from: Point, to: Point, accent: string, arcLift = 28) => `
  <path d="M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - arcLift}, ${to.x} ${to.y}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 8" opacity="0.88" />
`;

const renderDirectionArrow = (from: Point, to: Point, color: string) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = { x: to.x - 14 * Math.cos(angle) + 7 * Math.sin(angle), y: to.y - 14 * Math.sin(angle) - 7 * Math.cos(angle) };
  const right = { x: to.x - 14 * Math.cos(angle) - 7 * Math.sin(angle), y: to.y - 14 * Math.sin(angle) + 7 * Math.cos(angle) };

  return `
    <g opacity="0.78">
      <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
      <path d="M ${to.x} ${to.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z" fill="${color}" />
    </g>
  `;
};

const renderBall = (point: Point, emphasis: 'normal' | 'strong', trailFrom?: Point) => `
  <g filter="url(#softShadow)">
    ${trailFrom ? renderActionTrail(trailFrom, point, palette.guide, 18) : ''}
    <circle cx="${point.x}" cy="${point.y + 9}" r="9" fill="${palette.shadow}" opacity="0.42" />
    ${emphasis === 'strong' ? `<circle cx="${point.x}" cy="${point.y}" r="16" fill="none" stroke="${palette.actorGlow}" stroke-width="3.2" opacity="0.82" />` : ''}
    <circle cx="${point.x}" cy="${point.y}" r="11" fill="${palette.ball}" stroke="#d9d9d9" stroke-width="1.6" />
    <path d="M ${point.x - 5} ${point.y - 2} l5 -5 l5 5 l-2.5 6 h-5 z" fill="${palette.ballDetail}" opacity="0.9" />
  </g>
`;

const renderPlayerFigure = (entity: HeroEntity, point: Point, facing: Facing, scale: number) => {
  const tone = toneFor(entity.player);
  const colors = colorsFor(tone);
  const direction = facing === 'right' ? 1 : -1;
  const glow = entity.focus === 'actor' ? palette.actorGlow : entity.focus === 'target' ? palette.targetGlow : entity.focus === 'goalkeeper' ? palette.goalkeeperAccent : '#ffffff';
  const label = entity.player.shirtNumber;
  const labelFill = entity.focus === 'support' ? palette.panelAccent : palette.text;
  const stretch = entity.focus === 'goalkeeper' ? 1.08 : 1;

  return `
    <g transform="translate(${point.x} ${point.y}) scale(${scale * direction} ${scale * stretch})" filter="url(#softShadow)">
      <ellipse cx="0" cy="38" rx="18" ry="6" fill="${palette.shadow}" />
      <circle cx="0" cy="-19" r="10.5" fill="${palette.skin}" stroke="rgba(17,24,39,0.14)" stroke-width="1" />
      ${entity.focus !== 'support' ? `<circle cx="0" cy="2" r="21" fill="none" stroke="${glow}" stroke-width="${entity.focus === 'actor' ? 3 : 2.4}" opacity="0.9" />` : ''}
      <path d="M -12 -7 Q 0 -16 12 -7 L 12 26 Q 0 34 -12 26 Z" fill="${colors.primary}" />
      <rect x="-12" y="4" width="24" height="6" rx="3" fill="${colors.accent}" opacity="0.94" />
      <line x1="-7" y1="25" x2="-12" y2="42" stroke="${palette.boot}" stroke-width="5" stroke-linecap="round" />
      <line x1="6" y1="25" x2="12" y2="41" stroke="${palette.boot}" stroke-width="5" stroke-linecap="round" />
      <line x1="-11" y1="2" x2="-26" y2="18" stroke="${palette.boot}" stroke-width="5" stroke-linecap="round" />
      <line x1="11" y1="2" x2="25" y2="${entity.focus === 'actor' ? 14 : 18}" stroke="${palette.boot}" stroke-width="5" stroke-linecap="round" />
      <text x="0" y="5" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="${labelFill}">${label}</text>
    </g>
  `;
};

const renderPixelPlayer = (player: MatchVisualPlayerSnapshot, point: Point, emphasis: 'actor' | 'target' | 'support' | 'goalkeeper' | 'neutral') => {
  const tone = toneFor(player);
  const colors = colorsFor(tone);
  const outline = palette.pixelOutline;
  const glow = emphasis === 'actor' ? palette.actorGlow : emphasis === 'target' ? palette.targetGlow : emphasis === 'goalkeeper' ? palette.goalkeeperAccent : player.isUserControlled ? palette.userHalo : undefined;

  return `
    <g transform="translate(${point.x} ${point.y})" filter="url(#softShadow)">
      <ellipse cx="0" cy="16" rx="9" ry="4" fill="${palette.shadow}" opacity="0.42" />
      ${glow ? `<rect x="-11" y="-19" width="22" height="34" rx="5" fill="none" stroke="${glow}" stroke-width="2.5" opacity="0.92" />` : ''}
      <rect x="-3" y="-18" width="6" height="2" fill="${outline}" />
      <rect x="-5" y="-16" width="10" height="4" fill="${outline}" />
      <rect x="-5" y="-14" width="10" height="6" fill="${palette.skin}" />
      <rect x="-6" y="-18" width="12" height="6" fill="${outline}" opacity="0.88" />
      <rect x="-7" y="-10" width="14" height="12" fill="${colors.primary}" />
      <rect x="-7" y="-6" width="14" height="2" fill="${colors.accent}" opacity="0.95" />
      <rect x="-7" y="2" width="6" height="6" fill="#ffffff" />
      <rect x="1" y="2" width="6" height="6" fill="#ffffff" />
      <rect x="-7" y="8" width="6" height="7" fill="${colors.primary}" />
      <rect x="1" y="8" width="6" height="7" fill="${colors.primary}" />
      <rect x="-8" y="15" width="7" height="3" fill="${palette.boot}" />
      <rect x="1" y="15" width="7" height="3" fill="${palette.boot}" />
      <rect x="-10" y="-9" width="3" height="8" fill="${palette.skin}" />
      <rect x="7" y="-9" width="3" height="8" fill="${palette.skin}" />
      <text x="0" y="-22" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="${palette.text}">${player.shirtNumber}</text>
    </g>
  `;
};

const renderPixelBall = (point: Point, trailFrom?: Point) => `
  <g filter="url(#softShadow)">
    ${trailFrom ? `<line x1="${trailFrom.x}" y1="${trailFrom.y}" x2="${point.x}" y2="${point.y}" stroke="${palette.actorGlow}" stroke-width="2.5" stroke-dasharray="6 6" opacity="0.72" />` : ''}
    <rect x="${point.x - 5}" y="${point.y + 4}" width="10" height="3" fill="${palette.shadow}" opacity="0.38" />
    <rect x="${point.x - 4}" y="${point.y - 4}" width="8" height="8" rx="1" fill="${palette.ball}" stroke="#d9d9d9" stroke-width="1" />
    <rect x="${point.x - 1}" y="${point.y - 1}" width="2" height="2" fill="${palette.ballDetail}" />
  </g>
`;

const renderTacticalPitch = () => `
  <g opacity="0.98">
    <rect x="28" y="24" width="584" height="312" rx="22" fill="url(#pitchGradient)" stroke="${palette.line}" stroke-width="5" />
    ${Array.from({ length: 8 }, (_, index) => `<rect x="${28 + index * 73}" y="24" width="37" height="312" fill="${palette.stripe}" opacity="0.9" />`).join('')}
    <line x1="320" y1="24" x2="320" y2="336" stroke="${palette.line}" stroke-width="4" />
    <circle cx="320" cy="180" r="56" fill="none" stroke="${palette.line}" stroke-width="4" />
    <circle cx="320" cy="180" r="4.5" fill="${palette.line}" />
    <rect x="28" y="95" width="108" height="170" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="504" y="95" width="108" height="170" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="28" y="129" width="38" height="102" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="574" y="129" width="38" height="102" fill="none" stroke="${palette.line}" stroke-width="4" />
    <circle cx="95" cy="180" r="4.5" fill="${palette.line}" />
    <circle cx="545" cy="180" r="4.5" fill="${palette.line}" />
    <path d="M 28 38 h10 v10 h-4 v-6 h-6 z" fill="${palette.line}" opacity="0.95" />
    <path d="M 612 38 h-10 v10 h4 v-6 h6 z" fill="${palette.line}" opacity="0.95" />
    <path d="M 28 322 h10 v-10 h-4 v6 h-6 z" fill="${palette.line}" opacity="0.95" />
    <path d="M 612 322 h-10 v-10 h4 v6 h6 z" fill="${palette.line}" opacity="0.95" />
  </g>
`;

const renderTacticalBody = (context: SceneContext): string => {
  const { frame, event, ballStart, ballEnd } = context;
  const heroIds = new Map<string, HeroEntity['focus']>(context.heroEntities.map((entity) => [entity.player.id, entity.focus]));
  const players = frame.players
    .map((player) => ({ player, point: toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, player) }))
    .sort((left, right) => left.player.y - right.player.y);
  const ballPoint = toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, ballEnd);
  const ballTrailPoint = distance(ballStart, ballEnd) > 2 ? toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, ballStart) : undefined;
  const actorPoint = toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, event.destination);
  const originPoint = toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, event.origin);
  const targetPoint = toScenePoint({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, event.ballTarget);

  const overlaysByScene: Record<MatchSceneKey, string> = {
    'pass-received': `${renderDirectionArrow(originPoint, targetPoint, '#d9f99d')}<circle cx="${targetPoint.x}" cy="${targetPoint.y}" r="18" fill="none" stroke="#d9f99d" stroke-width="3" opacity="0.78" />`,
    'pass-intercepted': `${renderDirectionArrow(originPoint, targetPoint, '#ffd8a8')}<path d="M ${targetPoint.x - 12} ${targetPoint.y - 16} L ${targetPoint.x + 12} ${targetPoint.y + 8}" stroke="#fff3bf" stroke-width="5" stroke-linecap="round" opacity="0.88" />`,
    dribble: renderActionTrail(originPoint, targetPoint, '#91a7ff', 20),
    'defensive-duel': `<circle cx="${targetPoint.x}" cy="${targetPoint.y}" r="22" fill="none" stroke="#fff3bf" stroke-width="3" stroke-dasharray="6 5" opacity="0.82" />`,
    shot: renderDirectionArrow(actorPoint, targetPoint, '#ffec99'),
    'goalkeeper-save': renderActionTrail(originPoint, targetPoint, '#fff3bf', 16),
    goal: `${renderActionTrail(originPoint, targetPoint, '#fff3bf', 20)}<path d="M ${targetPoint.x - 10} ${targetPoint.y - 18} q 12 12 0 28" fill="none" stroke="#fff3bf" stroke-width="4" opacity="0.88" />`,
    rebound: renderDirectionArrow(originPoint, targetPoint, '#ffe066'),
    'corner-kick': renderActionTrail(originPoint, targetPoint, '#ffffff', 40),
    'penalty-kick': `<circle cx="${targetPoint.x}" cy="${targetPoint.y}" r="20" fill="none" stroke="#fff3bf" stroke-width="3" opacity="0.82" />`,
    fallback: renderDirectionArrow(originPoint, targetPoint, '#d9fbe8')
  };

  return [
    renderTacticalPitch(),
    overlaysByScene[event.sceneKey],
    players.map(({ player, point }) => renderPixelPlayer(player, point, heroIds.get(player.id) ?? 'neutral')).join(''),
    renderPixelBall(ballPoint, ballTrailPoint)
  ].join('');
};

const renderHud = (frame: MatchVisualFrame, event: MatchVisualEvent, sceneMoments: number, visualMode: VisualMode) => `
  <g>
    <rect x="28" y="24" width="${visualMode === 'tactical-map' ? 404 : 352}" height="92" rx="20" fill="${palette.panel}" />
    <text x="52" y="54" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${palette.text}">${event.headline}</text>
    <text x="52" y="79" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="${palette.panelAccent}">${frame.minute}' • ${visualMode === 'tactical-map' ? 'mapa amplo' : 'cena grande'} • ${sceneMoments} momento(s)</text>
    <text x="52" y="101" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${palette.panelAccent}">${frame.narration}</text>
  </g>
`;

const buildSceneContext = (match: MatchSummary): (SceneContext & { sceneMoments: number }) | undefined => {
  const sequence = match.visualSequence ?? buildMatchVisualSequence(match);
  const event = match.activeTurn?.visualEvent;
  const frame = sequence?.frames.at(-1);
  if (!sequence || !event || !frame) return undefined;

  const attackDirection: Facing =
    event.sceneKey === 'corner-kick' || event.sceneKey === 'penalty-kick' || event.sceneKey === 'shot' || event.sceneKey === 'goalkeeper-save' || event.sceneKey === 'goal' || event.sceneKey === 'rebound'
      ? 'right'
      : event.movementDirection === 'LEFT'
        ? 'left'
        : 'right';

  const ballStart =
    event.sceneKey === 'pass-received' || event.sceneKey === 'pass-intercepted' || event.sceneKey === 'corner-kick'
      ? event.origin
      : event.sceneKey === 'shot' || event.sceneKey === 'goalkeeper-save' || event.sceneKey === 'goal'
        ? event.destination
        : event.origin;

  const visualMode = resolveVisualMode(event.sceneKey);

  return {
    event,
    frame,
    heroEntities: resolveHeroEntities(event, frame),
    focusSide: event.actor.side,
    attackDirection,
    ballStart,
    ballEnd: event.ballTarget,
    visualMode,
    sceneMoments: sequence.frameCount
  };
};

const renderSceneBody = (camera: Camera, context: SceneContext): string => {
  if (context.visualMode === 'tactical-map') {
    return renderTacticalBody(context);
  }

  const { event, heroEntities, attackDirection, ballStart, ballEnd } = context;
  const actor = heroEntities.find((entity) => entity.kind === 'actor');
  const marker = heroEntities.find((entity) => entity.kind === 'marker');
  const receiver = heroEntities.find((entity) => entity.kind === 'receiver');
  const goalkeeper = heroEntities.find((entity) => entity.kind === 'goalkeeper');
  const supports = heroEntities.filter((entity) => entity.kind === 'support');

  const actorPoint = actor ? toScenePoint(camera, actor.player) : toScenePoint(camera, event.destination);
  const markerPoint = marker ? toScenePoint(camera, marker.player) : undefined;
  const receiverPoint = receiver ? toScenePoint(camera, receiver.player) : undefined;
  const goalkeeperPoint = goalkeeper ? toScenePoint(camera, goalkeeper.player) : undefined;
  const ballPoint = toScenePoint(camera, ballEnd);
  const ballTrailPoint = distance(ballStart, ballEnd) > 2 ? toScenePoint(camera, ballStart) : undefined;
  const goalNeeded = ['shot', 'goalkeeper-save', 'goal', 'rebound', 'penalty-kick', 'corner-kick'].includes(event.sceneKey);
  const goalSvg = goalNeeded ? renderGoal(camera, attackDirection) : '';
  const directionArrow =
    actor && distance(event.origin, event.destination) > 2
      ? renderDirectionArrow(toScenePoint(camera, event.origin), toScenePoint(camera, event.destination), actor.focus === 'actor' ? palette.actorGlow : palette.guide)
      : '';

  const playerSvgs = [
    ...supports.map((entity, index) => {
      const supportPoint = toScenePoint(camera, entity.player);
      const supportFacing = facingFromDirection(attackDirection, entity.player, event.ballTarget.x + index * 2);
      return renderPlayerFigure(entity, supportPoint, supportFacing, 0.88);
    }),
    marker && markerPoint ? renderPlayerFigure(marker, markerPoint, facingFromDirection(attackDirection === 'right' ? 'left' : 'right', marker.player, event.origin.x), 1) : '',
    receiver && receiverPoint ? renderPlayerFigure(receiver, receiverPoint, facingFromDirection(attackDirection, receiver.player, event.ballTarget.x), 1.02) : '',
    goalkeeper && goalkeeperPoint ? renderPlayerFigure(goalkeeper, goalkeeperPoint, attackDirection === 'right' ? 'left' : 'right', 1.08) : '',
    actor ? renderPlayerFigure(actor, actorPoint, facingFromDirection(attackDirection, actor.player, event.destination.x), 1.08) : ''
  ].join('');

  const sceneExtrasByKey: Record<MatchSceneKey, string> = {
    'pass-received': receiverPoint && actorPoint ? renderActionTrail(actorPoint, receiverPoint, '#d9f99d', 16) : '',
    'pass-intercepted': markerPoint && actorPoint ? `${renderActionTrail(actorPoint, ballPoint, '#ffe8a1', 12)}<path d="M ${markerPoint.x - 16} ${markerPoint.y - 24} L ${markerPoint.x + 16} ${markerPoint.y + 12}" stroke="#fff3bf" stroke-width="6" stroke-linecap="round" opacity="0.88" />` : '',
    dribble: markerPoint ? `<path d="M ${actorPoint.x - 10} ${actorPoint.y + 14} C ${actorPoint.x + 18} ${actorPoint.y - 18}, ${markerPoint.x - 10} ${markerPoint.y - 24}, ${ballPoint.x} ${ballPoint.y}" fill="none" stroke="#91a7ff" stroke-width="5" stroke-dasharray="10 8" opacity="0.9" />` : '',
    'defensive-duel': markerPoint ? `<circle cx="${(actorPoint.x + markerPoint.x) / 2}" cy="${(actorPoint.y + markerPoint.y) / 2}" r="38" fill="none" stroke="#fff3bf" stroke-width="4" stroke-dasharray="7 8" opacity="0.84" />` : '',
    shot: actorPoint ? renderActionTrail(actorPoint, ballPoint, '#ffec99', 22) : '',
    'goalkeeper-save': goalkeeperPoint && ballTrailPoint ? renderActionTrail(ballTrailPoint, goalkeeperPoint, '#fff3bf', 20) : '',
    goal: `${ballTrailPoint ? renderActionTrail(ballTrailPoint, ballPoint, '#fff3bf', 20) : ''}<path d="M ${ballPoint.x - 20} ${ballPoint.y - 22} q 18 18 0 40" fill="none" stroke="#fff3bf" stroke-width="5" opacity="0.9" />`,
    rebound: actorPoint && goalkeeperPoint ? `${renderActionTrail(goalkeeperPoint, ballPoint, '#fff3bf', 16)}${renderDirectionArrow(ballPoint, actorPoint, '#ffe066')}` : '',
    'corner-kick': renderCornerFlag(toScenePoint(camera, { x: camera.minX + 3, y: camera.maxY - 3 })) + (ballTrailPoint ? renderActionTrail(ballTrailPoint, ballPoint, '#ffffff', 42) : ''),
    'penalty-kick': actorPoint ? `<circle cx="${ballPoint.x}" cy="${ballPoint.y}" r="28" fill="none" stroke="#fff3bf" stroke-width="4" opacity="0.82" />${renderActionTrail(actorPoint, ballPoint, '#ffe066', 16)}` : '',
    fallback: actorPoint ? renderDirectionArrow(actorPoint, ballPoint, '#d9fbe8') : ''
  };

  return [goalSvg, renderStage(camera, event.sceneKey), directionArrow, sceneExtrasByKey[event.sceneKey], playerSvgs, renderBall(ballPoint, 'strong', ballTrailPoint)].join('');
};

export const renderMatchVisualSequenceSvg = (match: MatchSummary): string => {
  const context = buildSceneContext(match);
  if (!context) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" rx="28" fill="#1f8f5a" /><text x="40" y="60" fill="#fff" font-size="24">Sem sequência visual disponível.</text></svg>';
  }

  const camera = buildCamera(context.event, context.heroEntities, context.visualMode);

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img">',
    renderDefs(),
    renderBackdrop(),
    renderSceneBody(camera, context),
    renderHud(context.frame, context.event, context.sceneMoments, context.visualMode),
    '</svg>'
  ].join('');
};
