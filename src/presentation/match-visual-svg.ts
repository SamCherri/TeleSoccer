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
  card: '#f7f3e8',
  cardShadow: '#d7cfbf',
  pitch: '#2d7c33',
  pitchDark: '#23612a',
  stripe: '#3b913f',
  line: '#efe7d2',
  outline: '#2a2016',
  text: '#241a12',
  textSoft: '#5f5546',
  homePrimary: '#d94833',
  homeAccent: '#ffe0d8',
  awayPrimary: '#2a61cf',
  awayAccent: '#d9e6ff',
  goalkeeperPrimary: '#d59a1d',
  goalkeeperAccent: '#fff0ab',
  skin: '#f0c49b',
  hair: '#3d2417',
  boot: '#23242b',
  ball: '#ffffff',
  ballDetail: '#1d2433',
  glow: '#fff4a8',
  passTrail: '#fff3bf',
  shotTrail: '#ffd166',
  userHalo: '#fff0a6',
  hud: '#ffffff',
  hudMuted: '#ebe4d2'
} as const;

type Facing = 'left' | 'right';
type Tone = 'home' | 'away' | 'goalkeeper';
type VisualMode = 'field-scene' | 'hero-scene';

const visualModeProductLabelMap: Record<VisualMode, string> = {
  'field-scene': 'CAMPO',
  'hero-scene': 'CONFRONTO'
};

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
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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
  tacticalSceneKeys.includes(sceneKey) ? 'field-scene' : cinematicSceneKeys.includes(sceneKey) ? 'hero-scene' : 'field-scene';

const buildCamera = (event: MatchVisualEvent, heroEntities: HeroEntity[], visualMode: VisualMode): Camera => {
  if (visualMode === 'field-scene') {
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

  const settingsByScene: Record<MatchSceneKey, { padX: number; padY: number; minWidth: number; minHeight: number }> = {
    'pass-received': { padX: 12, padY: 14, minWidth: 42, minHeight: 40 },
    'pass-intercepted': { padX: 12, padY: 14, minWidth: 44, minHeight: 40 },
    dribble: { padX: 10, padY: 12, minWidth: 32, minHeight: 34 },
    'defensive-duel': { padX: 10, padY: 12, minWidth: 32, minHeight: 34 },
    shot: { padX: 16, padY: 18, minWidth: 56, minHeight: 42 },
    'goalkeeper-save': { padX: 16, padY: 18, minWidth: 56, minHeight: 42 },
    goal: { padX: 16, padY: 18, minWidth: 56, minHeight: 42 },
    rebound: { padX: 16, padY: 18, minWidth: 54, minHeight: 42 },
    'corner-kick': { padX: 18, padY: 16, minWidth: 62, minHeight: 50 },
    'penalty-kick': { padX: 18, padY: 18, minWidth: 54, minHeight: 42 },
    fallback: { padX: 16, padY: 18, minWidth: 56, minHeight: 44 }
  };

  const settings = settingsByScene[event.sceneKey];
  let minX = base.minX - settings.padX;
  let maxX = base.maxX + settings.padX;
  let minY = base.minY - settings.padY;
  let maxY = base.maxY + settings.padY;

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

  return {
    minX: clamp(minX, 0, 100 - settings.minWidth),
    maxX: clamp(maxX, settings.minWidth, 100),
    minY: clamp(minY, 0, 100 - settings.minHeight),
    maxY: clamp(maxY, settings.minHeight, 100)
  };
};

const toScenePoint = (camera: Camera, point: MatchVisualCoordinate): Point => {
  const width = Math.max(camera.maxX - camera.minX, 1);
  const height = Math.max(camera.maxY - camera.minY, 1);
  const x = 32 + ((point.x - camera.minX) / width) * 576;
  const y = 32 + ((point.y - camera.minY) / height) * 296;
  return { x: clamp(x, 24, 616), y: clamp(y, 26, 334) };
};

const renderBackground = () => `
  <rect width="${viewBox.width}" height="${viewBox.height}" fill="#dfe8d4" />
  <rect x="16" y="16" width="608" height="328" rx="26" fill="${palette.cardShadow}" />
  <rect x="10" y="10" width="620" height="336" rx="28" fill="${palette.card}" stroke="${palette.outline}" stroke-width="4" />
`;

const renderPitchFrame = (camera: Camera, visualMode: VisualMode, sceneKey: MatchSceneKey) => {
  const left = toScenePoint(camera, { x: camera.minX, y: camera.minY });
  const right = toScenePoint(camera, { x: camera.maxX, y: camera.maxY });
  const width = right.x - left.x;
  const height = right.y - left.y;
  const midfieldX = lerp(left.x, right.x, clamp((50 - camera.minX) / Math.max(camera.maxX - camera.minX, 1), 0, 1));
  const centerY = (left.y + right.y) / 2;
  const leftPenalty = toScenePoint(camera, { x: 12, y: 22 });
  const rightPenalty = toScenePoint(camera, { x: 88, y: 78 });
  const showPenalty = visualMode === 'field-scene' || ['shot', 'goalkeeper-save', 'goal', 'rebound', 'corner-kick', 'penalty-kick'].includes(sceneKey);

  return `
    <rect x="${left.x}" y="${left.y}" width="${width}" height="${height}" rx="18" fill="${palette.pitch}" stroke="${palette.outline}" stroke-width="3" />
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
      const stripeWidth = width / 8;
      return `<rect x="${left.x + index * stripeWidth}" y="${left.y}" width="${stripeWidth}" height="${height}" fill="${index % 2 === 0 ? palette.stripe : palette.pitchDark}" opacity="0.55" />`;
    }).join('')}
    <rect x="${left.x}" y="${left.y}" width="${width}" height="${height}" rx="18" fill="none" stroke="${palette.line}" stroke-width="4" />
    <line x1="${midfieldX}" y1="${left.y}" x2="${midfieldX}" y2="${right.y}" stroke="${palette.line}" stroke-width="3" />
    <circle cx="${midfieldX}" cy="${centerY}" r="${Math.min(width, height) * 0.12}" fill="none" stroke="${palette.line}" stroke-width="3" />
    <circle cx="${midfieldX}" cy="${centerY}" r="4" fill="${palette.line}" />
    ${showPenalty ? `<rect x="${left.x}" y="${leftPenalty.y}" width="${Math.min(width * 0.16, 88)}" height="${Math.max(70, rightPenalty.y - leftPenalty.y)}" fill="none" stroke="${palette.line}" stroke-width="3" />` : ''}
    ${showPenalty ? `<rect x="${left.x}" y="${centerY - 40}" width="${Math.min(width * 0.055, 32)}" height="80" fill="none" stroke="${palette.line}" stroke-width="3" />` : ''}
    ${showPenalty ? `<rect x="${right.x - Math.min(width * 0.16, 88)}" y="${leftPenalty.y}" width="${Math.min(width * 0.16, 88)}" height="${Math.max(70, rightPenalty.y - leftPenalty.y)}" fill="none" stroke="${palette.line}" stroke-width="3" />` : ''}
    ${showPenalty ? `<rect x="${right.x - Math.min(width * 0.055, 32)}" y="${centerY - 40}" width="${Math.min(width * 0.055, 32)}" height="80" fill="none" stroke="${palette.line}" stroke-width="3" />` : ''}
  `;
};

const renderGoal = (camera: Camera, side: Facing) => {
  const xField = side === 'right' ? camera.maxX : camera.minX;
  const top = toScenePoint(camera, { x: xField, y: 36 });
  const bottom = toScenePoint(camera, { x: xField, y: 64 });
  const postX = side === 'right' ? top.x : top.x + 4;
  const netX = side === 'right' ? postX + 18 : postX - 18;
  const direction = side === 'right' ? 1 : -1;

  return `
    <line x1="${postX}" y1="${top.y}" x2="${postX}" y2="${bottom.y}" stroke="${palette.line}" stroke-width="5" />
    <line x1="${postX}" y1="${top.y}" x2="${netX}" y2="${top.y + 8}" stroke="${palette.line}" stroke-width="4" />
    <line x1="${postX}" y1="${bottom.y}" x2="${netX}" y2="${bottom.y - 8}" stroke="${palette.line}" stroke-width="4" />
    <line x1="${netX}" y1="${top.y + 8}" x2="${netX}" y2="${bottom.y - 8}" stroke="${palette.line}" stroke-width="4" />
    ${[0, 1, 2].map((index) => `<line x1="${postX + direction * (4 + index * 5)}" y1="${top.y + 2}" x2="${postX + direction * (4 + index * 5)}" y2="${bottom.y - 2}" stroke="${palette.hudMuted}" stroke-width="1" />`).join('')}
  `;
};

const renderCornerFlag = (point: Point) => `
  <line x1="${point.x}" y1="${point.y + 16}" x2="${point.x}" y2="${point.y - 18}" stroke="${palette.line}" stroke-width="3" />
  <path d="M ${point.x} ${point.y - 18} L ${point.x + 16} ${point.y - 12} L ${point.x} ${point.y - 5} Z" fill="#ffd166" stroke="${palette.outline}" stroke-width="1.5" />
`;

const renderTrail = (from: Point, to: Point, color: string, lift: number): string => `
  <path d="M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - lift}, ${to.x} ${to.y}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="8 7" />
`;

const renderBall = (point: Point, emphasis: 'normal' | 'strong', trailFrom?: Point, trailColor: string = palette.passTrail) => `
  ${trailFrom ? renderTrail(trailFrom, point, trailColor, 18) : ''}
  ${emphasis === 'strong' ? `<circle cx="${point.x}" cy="${point.y}" r="14" fill="none" stroke="${palette.glow}" stroke-width="3" />` : ''}
  <circle cx="${point.x}" cy="${point.y + 6}" r="8" fill="#000000" opacity="0.16" />
  <circle cx="${point.x}" cy="${point.y}" r="10" fill="${palette.ball}" stroke="${palette.outline}" stroke-width="2" />
  <path d="M ${point.x - 4} ${point.y - 2} l4 -4 l4 4 l-2 5 h-4 z" fill="${palette.ballDetail}" />
`;

const renderTopDownPlayer = (player: MatchVisualPlayerSnapshot, point: Point): string => {
  const colors = colorsFor(toneFor(player));
  const halo = player.isUserControlled ? `<circle cx="${point.x}" cy="${point.y - 10}" r="14" fill="none" stroke="${palette.userHalo}" stroke-width="3" />` : '';
  const marker = player.isPrimaryActor || player.isPrimaryTarget ? `<circle cx="${point.x}" cy="${point.y - 10}" r="16" fill="none" stroke="${player.isPrimaryActor ? palette.glow : '#ffffff'}" stroke-width="2.5" stroke-dasharray="4 4" />` : '';

  return `
    ${halo}
    ${marker}
    <circle cx="${point.x}" cy="${point.y + 8}" r="8" fill="#000000" opacity="0.18" />
    <circle cx="${point.x}" cy="${point.y}" r="11" fill="${colors.primary}" stroke="${palette.outline}" stroke-width="2" />
    <rect x="${point.x - 6}" y="${point.y - 4}" width="12" height="6" rx="3" fill="${colors.accent}" />
    <text x="${point.x}" y="${point.y + 4}" font-family="Arial, Helvetica, sans-serif" font-size="8" text-anchor="middle" font-weight="700" fill="#ffffff">${player.shirtNumber}</text>
  `;
};

const renderPixelSprite = (entity: HeroEntity, point: Point, facing: Facing, scale = 1): string => {
  const colors = colorsFor(toneFor(entity.player));
  const direction = facing === 'right' ? 1 : -1;
  const outline = palette.outline;
  const halo = entity.player.isUserControlled
    ? `<rect x="${point.x - 22}" y="${point.y - 54}" width="44" height="62" rx="14" fill="none" stroke="${palette.userHalo}" stroke-width="3" />`
    : '';
  const focus = entity.focus === 'actor' ? palette.glow : entity.focus === 'target' ? '#ffffff' : entity.focus === 'goalkeeper' ? palette.goalkeeperAccent : 'transparent';
  const swing = entity.focus === 'actor' ? 3 : entity.focus === 'target' ? -3 : 0;
  const tx = point.x;
  const ty = point.y;

  return `
    ${halo}
    <g transform="translate(${tx} ${ty}) scale(${scale * direction} ${scale})">
      ${focus !== 'transparent' ? `<circle cx="0" cy="-26" r="22" fill="none" stroke="${focus}" stroke-width="3" />` : ''}
      <ellipse cx="0" cy="14" rx="16" ry="5" fill="#000000" opacity="0.18" />
      <rect x="-6" y="-42" width="12" height="12" fill="${outline}" />
      <rect x="-4" y="-40" width="8" height="8" fill="${palette.hair}" />
      <rect x="-5" y="-32" width="10" height="10" fill="${palette.skin}" stroke="${outline}" stroke-width="1.5" />
      <rect x="-9" y="-20" width="18" height="22" fill="${colors.primary}" stroke="${outline}" stroke-width="1.5" />
      <rect x="-9" y="-10" width="18" height="4" fill="${colors.accent}" />
      <rect x="-8" y="2" width="7" height="12" fill="#f8f9fa" stroke="${outline}" stroke-width="1" />
      <rect x="1" y="2" width="7" height="12" fill="#f8f9fa" stroke="${outline}" stroke-width="1" />
      <rect x="-8" y="14" width="7" height="10" fill="${palette.boot}" stroke="${outline}" stroke-width="1" />
      <rect x="1" y="14" width="7" height="10" fill="${palette.boot}" stroke="${outline}" stroke-width="1" />
      <rect x="-15" y="-18" width="6" height="14" fill="${palette.skin}" stroke="${outline}" stroke-width="1" transform="rotate(${10 + swing} -12 -12)" />
      <rect x="9" y="-18" width="6" height="14" fill="${palette.skin}" stroke="${outline}" stroke-width="1" transform="rotate(${-12 + swing} 12 -12)" />
    </g>
  `;
};

const renderNarrativePanel = (headline: string, narration: string, mode: VisualMode): string => {
  const panelY = mode === 'field-scene' ? 276 : 282;
  return `
    <rect x="34" y="${panelY}" width="572" height="52" rx="18" fill="#ffffff" stroke="${palette.outline}" stroke-width="3" />
    <text x="56" y="${panelY + 18}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="${palette.text}">${escapeXml(headline.toUpperCase())}</text>
    <text x="56" y="${panelY + 38}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${palette.textSoft}">${escapeXml(narration)}</text>
  `;
};

const renderHud = (context: SceneContext): string => {
  const minute = `${context.frame.minute}'`;
  const possession = context.focusSide === MatchPossessionSide.Home ? 'HOME' : 'AWAY';
  const modeLabel = visualModeProductLabelMap[context.visualMode];

  return `
    <rect x="34" y="28" width="310" height="54" rx="18" fill="#ffffff" stroke="${palette.outline}" stroke-width="3" />
    <text x="52" y="50" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="${palette.text}">${escapeXml(modeLabel)}</text>
    <text x="52" y="68" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${palette.textSoft}">${escapeXml(context.event.headline)}</text>
    <rect x="414" y="28" width="192" height="54" rx="18" fill="#ffffff" stroke="${palette.outline}" stroke-width="3" />
    <text x="430" y="50" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${palette.text}">POSSE ${possession}</text>
    <text x="430" y="68" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${palette.textSoft}">${minute} • seq ${context.event.sequence}</text>
  `;
};

const renderFieldScene = (context: SceneContext): string => {
  const camera = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const points = new Map(context.frame.players.map((player) => [player.id, toScenePoint(camera, { x: player.x, y: player.y })]));
  const actorPoint = points.get(context.event.actor.lineupId) ?? toScenePoint(camera, context.ballStart);
  const targetPoint = toScenePoint(camera, context.ballEnd);
  const leftCorner = toScenePoint(camera, { x: 0, y: 100 });

  return `
    ${renderPitchFrame(camera, 'field-scene', context.event.sceneKey)}
    ${context.frame.players.map((player) => renderTopDownPlayer(player, points.get(player.id) ?? actorPoint)).join('')}
    ${context.event.sceneKey === 'corner-kick' ? renderCornerFlag(leftCorner) : ''}
    ${['shot', 'goalkeeper-save', 'goal', 'rebound', 'penalty-kick', 'corner-kick'].includes(context.event.sceneKey) ? renderGoal(camera, 'right') : ''}
    ${renderTrail(actorPoint, targetPoint, context.event.sceneKey === 'shot' || context.event.sceneKey === 'goal' ? palette.shotTrail : palette.passTrail, 18)}
    <line x1="${actorPoint.x}" y1="${actorPoint.y}" x2="${targetPoint.x}" y2="${targetPoint.y}" stroke="${context.event.sceneKey === 'pass-intercepted' ? '#ffadad' : '#ffffff'}" stroke-width="2" stroke-dasharray="6 6" />
    ${renderBall(targetPoint, context.event.sceneKey === 'pass-intercepted' ? 'strong' : 'normal', undefined)}
  `;
};

const renderHeroScene = (context: SceneContext): string => {
  const camera = buildCamera(context.event, context.heroEntities, 'hero-scene');
  const heroAnchor = toScenePoint(camera, context.ballEnd);
  const actor = context.heroEntities.find((entity) => entity.kind === 'actor');
  const target = context.heroEntities.find((entity) => entity.kind === 'marker' || entity.kind === 'receiver' || entity.kind === 'goalkeeper');
  const support = context.heroEntities.filter((entity) => entity.kind === 'support');
  const actorPoint = actor ? toScenePoint(camera, { x: actor.player.x, y: actor.player.y }) : heroAnchor;
  const targetPoint = target ? toScenePoint(camera, { x: target.player.x, y: target.player.y }) : { x: actorPoint.x + 88, y: actorPoint.y - 12 };
  const ballPoint = toScenePoint(camera, context.ballEnd);

  return `
    ${renderPitchFrame(camera, 'hero-scene', context.event.sceneKey)}
    ${['shot', 'goalkeeper-save', 'goal', 'rebound', 'penalty-kick', 'corner-kick'].includes(context.event.sceneKey) ? renderGoal(camera, 'right') : ''}
    ${context.event.sceneKey === 'corner-kick' ? renderCornerFlag(toScenePoint(camera, { x: camera.minX + 2, y: camera.maxY - 3 })) : ''}
    ${support.map((entity, index) => renderPixelSprite(entity, { x: heroAnchor.x + 112 + index * 44, y: heroAnchor.y - 8 + index * 10 }, context.attackDirection, 0.82)).join('')}
    ${target ? renderPixelSprite(target, targetPoint, facingFromDirection(context.attackDirection === 'right' ? 'left' : 'right', target.player, heroAnchor.x), target.kind === 'goalkeeper' ? 1.08 : 1) : ''}
    ${actor ? renderPixelSprite(actor, actorPoint, facingFromDirection(context.attackDirection, actor.player, heroAnchor.x), 1.06) : ''}
    ${renderBall(ballPoint, 'strong', actor ? { x: actorPoint.x + (context.attackDirection === 'right' ? 24 : -24), y: actorPoint.y - 2 } : undefined, ['shot', 'goal', 'goalkeeper-save'].includes(context.event.sceneKey) ? palette.shotTrail : palette.passTrail)}
  `;
};

const buildSceneContext = (frame: MatchVisualFrame, event: MatchVisualEvent): SceneContext => {
  const heroEntities = resolveHeroEntities(event, frame);
  const attackDirection: Facing = event.destination.x >= event.origin.x ? 'right' : 'left';

  return {
    event,
    frame,
    heroEntities,
    focusSide: frame.possessionSide,
    attackDirection,
    ballStart: event.origin,
    ballEnd: frame.ball,
    visualMode: resolveVisualMode(event.sceneKey)
  };
};

export const renderMatchVisualSequenceSvg = (match: MatchSummary): string => {
  const visualSequence = match.visualSequence ?? buildMatchVisualSequence(match);
  const frame = visualSequence?.frames[visualSequence.frames.length - 1];
  const event = match.activeTurn?.visualEvent;

  if (!frame || !event) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox.width} ${viewBox.height}" role="img">
        ${renderBackground()}
        ${renderPitchFrame({ minX: 0, maxX: 100, minY: 0, maxY: 100 }, 'field-scene', 'fallback')}
        ${renderNarrativePanel('Lance em andamento', 'Sequência visual indisponível para este turno.', 'field-scene')}
      </svg>
    `.trim();
  }

  const context = buildSceneContext(frame, event);
  const body = context.visualMode === 'field-scene' ? renderFieldScene(context) : renderHeroScene(context);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox.width} ${viewBox.height}" role="img">
      ${renderBackground()}
      ${renderHud(context)}
      ${body}
      ${renderNarrativePanel(context.event.headline, frame.narration, context.visualMode)}
    </svg>
  `.trim();
};
