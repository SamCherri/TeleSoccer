import { MatchSceneKey } from '../../domain/match/types';

export interface MatchSceneAsset {
  key: MatchSceneKey;
  title: string;
  alt: string;
  hudLabel: string;
  mood: 'calm' | 'warning' | 'danger' | 'success';
  svg: string;
}

type TeamTone = 'home' | 'away' | 'goalkeeper';
type SceneLayoutMode = 'duel' | 'map';

interface PixelPlayerFigure {
  x: number;
  y: number;
  tone: TeamTone;
  facing?: 'left' | 'right';
  pose?: 'idle' | 'run' | 'shoot' | 'block' | 'dive' | 'celebrate' | 'protect';
  scale?: number;
}

interface BallFigure {
  x: number;
  y: number;
  trailTo?: { x: number; y: number };
  color?: string;
  glow?: string;
}

const palette = {
  bgNight: '#0b1a12',
  panel: '#10261b',
  panelAlt: '#163523',
  pitch: '#2f9e44',
  pitchDark: '#227a35',
  pitchStripe: '#3cac54',
  line: '#d8ffe5',
  homePrimary: '#3b82f6',
  homeAccent: '#93c5fd',
  awayPrimary: '#ef4444',
  awayAccent: '#fca5a5',
  goalkeeperPrimary: '#f59e0b',
  goalkeeperAccent: '#fde68a',
  skin: '#f1c27d',
  hair: '#3f2a17',
  boot: '#111827',
  ball: '#ffffff',
  ballShadow: '#0f172a',
  goal: '#f8fafc',
  net: '#dbeafe',
  hudText: '#f8fafc',
  hudSubtle: '#bbf7d0',
  shadow: 'rgba(0, 0, 0, 0.34)',
  glowDanger: '#ffd43b',
  glowSuccess: '#86efac',
  glowWarning: '#fdba74'
} as const;

const toneColors: Record<TeamTone, { primary: string; accent: string }> = {
  home: { primary: palette.homePrimary, accent: palette.homeAccent },
  away: { primary: palette.awayPrimary, accent: palette.awayAccent },
  goalkeeper: { primary: palette.goalkeeperPrimary, accent: palette.goalkeeperAccent }
};

const pixelRect = (x: number, y: number, width: number, height: number, fill: string, opacity?: number): string =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${opacity === undefined ? '' : ` opacity="${opacity}"`} shape-rendering="crispEdges" />`;

const svgHeader = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" shape-rendering="crispEdges">';
const svgFooter = '</svg>';

const renderPitchBase = (mode: SceneLayoutMode): string => {
  const centerY = mode === 'duel' ? 212 : 188;
  return `
    <defs>
      <linearGradient id="stadiumBg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${palette.bgNight}" />
        <stop offset="100%" stop-color="#050b08" />
      </linearGradient>
      <linearGradient id="pitchGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${palette.pitch}" />
        <stop offset="100%" stop-color="${palette.pitchDark}" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#stadiumBg)" />
    <rect x="12" y="28" width="616" height="320" rx="18" fill="${palette.panel}" />
    <rect x="28" y="74" width="584" height="250" rx="16" fill="url(#pitchGradient)" />
    ${pixelRect(28, 100, 584, 24, palette.pitchStripe, 0.34)}
    ${pixelRect(28, 154, 584, 24, palette.pitchStripe, 0.34)}
    ${pixelRect(28, 208, 584, 24, palette.pitchStripe, 0.34)}
    ${pixelRect(28, 262, 584, 24, palette.pitchStripe, 0.34)}
    <rect x="40" y="86" width="560" height="226" fill="none" stroke="${palette.line}" stroke-width="4" />
    <line x1="320" y1="86" x2="320" y2="312" stroke="${palette.line}" stroke-width="4" />
    <rect x="40" y="142" width="76" height="114" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="524" y="142" width="76" height="114" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="40" y="168" width="28" height="62" fill="none" stroke="${palette.line}" stroke-width="4" />
    <rect x="572" y="168" width="28" height="62" fill="none" stroke="${palette.line}" stroke-width="4" />
    <circle cx="320" cy="${centerY}" r="34" fill="none" stroke="${palette.line}" stroke-width="4" />
    <circle cx="320" cy="${centerY}" r="3" fill="${palette.line}" />
    <circle cx="94" cy="198" r="3" fill="${palette.line}" />
    <circle cx="546" cy="198" r="3" fill="${palette.line}" />
  `;
};

const renderGoal = (side: 'left' | 'right'): string => {
  const isRight = side === 'right';
  const frameX = isRight ? 586 : 18;
  const postX = isRight ? 574 : 46;
  const netX = isRight ? 606 : 14;
  const dir = isRight ? 1 : -1;

  return `
    <g opacity="0.96">
      ${pixelRect(frameX, 150, 24, 94, palette.goal, 0.12)}
      <line x1="${postX}" y1="150" x2="${postX}" y2="244" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${postX}" y1="150" x2="${netX}" y2="162" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${postX}" y1="244" x2="${netX}" y2="232" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${netX}" y1="162" x2="${netX}" y2="232" stroke="${palette.goal}" stroke-width="4" />
      ${[0, 1, 2, 3].map((index) => `<line x1="${postX}" y1="${162 + index * 18}" x2="${netX}" y2="${162 + index * 18}" stroke="${palette.net}" stroke-width="2" opacity="0.82" />`).join('')}
      ${[0, 1, 2].map((index) => `<line x1="${postX + dir * (6 + index * 8)}" y1="150" x2="${postX + dir * (6 + index * 8)}" y2="244" stroke="${palette.net}" stroke-width="1.8" opacity="0.72" />`).join('')}
    </g>
  `;
};

const renderPixelPlayer = ({ x, y, tone, facing = 'right', pose = 'idle', scale = 1 }: PixelPlayerFigure): string => {
  const colors = toneColors[tone];
  const dir = facing === 'right' ? 1 : -1;
  const legOffset = pose === 'run' ? 4 : pose === 'shoot' ? 7 : pose === 'dive' ? 10 : 2;
  const armSpread = pose === 'block' ? 9 : pose === 'celebrate' ? 12 : pose === 'dive' ? 14 : 6;
  const torsoTilt = pose === 'shoot' ? -3 : pose === 'dive' ? -10 : 0;
  const headOffset = pose === 'dive' ? -3 : 0;

  return `
    <g transform="translate(${x} ${y}) scale(${scale}) scale(${dir} 1)">
      <ellipse cx="0" cy="30" rx="16" ry="5" fill="${palette.shadow}" />
      ${pixelRect(-6, -26 + headOffset, 12, 12, palette.skin)}
      ${pixelRect(-6, -30 + headOffset, 12, 4, palette.hair)}
      ${pixelRect(-8, -14 + torsoTilt, 16, 20, colors.primary)}
      ${pixelRect(-8, -4 + torsoTilt, 16, 4, colors.accent)}
      ${pixelRect(-12 - armSpread / 4, -10 + torsoTilt, 4, 14, palette.skin)}
      ${pixelRect(8 + armSpread / 4, -10 + torsoTilt, 4, 14, palette.skin)}
      ${pixelRect(-6, 6, 5, 16 + legOffset, palette.skin)}
      ${pixelRect(1, 6, 5, 16 + (pose === 'run' ? 0 : legOffset), palette.skin)}
      ${pixelRect(-7, 20 + legOffset, 6, 4, palette.boot)}
      ${pixelRect(1, 20 + (pose === 'run' ? 0 : legOffset), 6, 4, palette.boot)}
    </g>
  `;
};

const renderBall = ({ x, y, trailTo, color = palette.ball, glow }: BallFigure): string => `
  <g>
    ${trailTo ? `<path d="M ${trailTo.x} ${trailTo.y} Q ${(trailTo.x + x) / 2} ${Math.min(trailTo.y, y) - 18}, ${x} ${y}" fill="none" stroke="${glow ?? color}" stroke-width="4" stroke-dasharray="8 6" opacity="0.82" />` : ''}
    <circle cx="${x}" cy="${y + 6}" r="7" fill="${palette.shadow}" opacity="0.56" />
    ${glow ? `<circle cx="${x}" cy="${y}" r="16" fill="${glow}" opacity="0.18" />` : ''}
    <circle cx="${x}" cy="${y}" r="10" fill="${color}" stroke="${palette.ballShadow}" stroke-width="2" />
    <path d="M ${x - 4} ${y - 2} l4 -4 l4 4 l-2 5 h-4 z" fill="#111827" opacity="0.94" />
  </g>
`;

const renderArrow = (from: { x: number; y: number }, to: { x: number; y: number }, color: string): string => `
  <g opacity="0.92">
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="5" stroke-linecap="square" />
    <path d="M ${to.x} ${to.y} l-12 -8 l0 6 l-8 0 l0 4 l8 0 l0 6 z" fill="${color}" />
  </g>
`;

const renderHud = (title: string, subtitle: string, mood: MatchSceneAsset['mood'], mode: SceneLayoutMode): string => {
  const moodColor = mood === 'danger' ? palette.glowDanger : mood === 'success' ? palette.glowSuccess : mood === 'warning' ? palette.glowWarning : palette.hudSubtle;
  const width = mode === 'duel' ? 332 : 308;
  return `
    <g>
      <rect x="34" y="26" width="${width}" height="64" rx="8" fill="${palette.panelAlt}" stroke="${moodColor}" stroke-width="3" />
      ${pixelRect(44, 36, 56, 12, moodColor, 0.28)}
      <text x="44" y="58" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${palette.hudText}">${title}</text>
      <text x="44" y="78" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${palette.hudSubtle}">${subtitle}</text>
    </g>
  `;
};

const renderRadar = (mood: MatchSceneAsset['mood'], mode: SceneLayoutMode): string => {
  const color = mood === 'danger' ? palette.glowDanger : mood === 'success' ? palette.glowSuccess : mood === 'warning' ? palette.glowWarning : palette.homeAccent;
  const x = mode === 'duel' ? 500 : 520;
  return `
    <g>
      <rect x="${x}" y="28" width="108" height="58" rx="8" fill="${palette.panelAlt}" stroke="${color}" stroke-width="3" />
      ${pixelRect(x + 10, 38, 88, 38, palette.pitchDark, 0.8)}
      <rect x="${x + 16}" y="44" width="76" height="26" fill="none" stroke="${palette.line}" stroke-width="2" />
      <line x1="${x + 54}" y1="44" x2="${x + 54}" y2="70" stroke="${palette.line}" stroke-width="2" />
      <circle cx="${x + 48}" cy="56" r="4" fill="${palette.homePrimary}" />
      <circle cx="${x + 68}" cy="62" r="4" fill="${palette.awayPrimary}" />
      <circle cx="${x + 82}" cy="50" r="4" fill="${color}" />
    </g>
  `;
};

const renderCornerFlag = (): string => `
  <g>
    <line x1="78" y1="294" x2="78" y2="94" stroke="${palette.goal}" stroke-width="4" />
    <path d="M 78 96 L 108 104 L 78 116 z" fill="${palette.glowDanger}" />
  </g>
`;

const renderDuelBurst = (x: number, y: number, color: string): string => `
  <g opacity="0.88">
    ${[0, 1, 2, 3, 4, 5].map((index) => {
      const angle = (Math.PI / 3) * index;
      const x2 = x + Math.cos(angle) * 34;
      const y2 = y + Math.sin(angle) * 24;
      return `<line x1="${x}" y1="${y}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="3" />`;
    }).join('')}
  </g>
`;

const scene = (title: string, subtitle: string, mood: MatchSceneAsset['mood'], mode: SceneLayoutMode, body: string): string =>
  [svgHeader, renderPitchBase(mode), renderHud(title, subtitle, mood, mode), renderRadar(mood, mode), body, svgFooter].join('');

export const matchSceneAssets: Record<MatchSceneKey, MatchSceneAsset> = {
  'pass-received': {
    key: 'pass-received',
    title: 'Passe recebido',
    alt: 'Mapa tático ampliado mostra a troca de passes com o recebedor livre.',
    hudLabel: 'mapa de circulação',
    mood: 'calm',
    svg: scene('Passe recebido', 'Mapa grande: opção curta liberada.', 'calm', 'map', [
      renderPixelPlayer({ x: 176, y: 224, tone: 'home', facing: 'right', pose: 'run', scale: 0.82 }),
      renderPixelPlayer({ x: 324, y: 188, tone: 'home', facing: 'right', pose: 'idle', scale: 0.82 }),
      renderPixelPlayer({ x: 426, y: 176, tone: 'away', facing: 'left', pose: 'block', scale: 0.82 }),
      renderPixelPlayer({ x: 474, y: 236, tone: 'away', facing: 'left', pose: 'idle', scale: 0.82 }),
      renderArrow({ x: 192, y: 206 }, { x: 302, y: 182 }, '#bbf7d0'),
      renderArrow({ x: 332, y: 188 }, { x: 392, y: 168 }, '#93c5fd'),
      renderBall({ x: 318, y: 186, trailTo: { x: 212, y: 206 }, glow: palette.glowSuccess }),
      pixelRect(98, 286, 168, 16, '#08131f', 0.55),
      pixelRect(366, 286, 174, 16, '#08131f', 0.55)
    ].join(''))
  },
  'pass-intercepted': {
    key: 'pass-intercepted',
    title: 'Passe interceptado',
    alt: 'Mapa tático ampliado destaca a linha de passe sendo cortada pelo adversário.',
    hudLabel: 'rota bloqueada',
    mood: 'warning',
    svg: scene('Passe interceptado', 'Mapa grande: corredor central fechado.', 'warning', 'map', [
      renderPixelPlayer({ x: 168, y: 238, tone: 'home', facing: 'right', pose: 'run', scale: 0.82 }),
      renderPixelPlayer({ x: 312, y: 192, tone: 'away', facing: 'left', pose: 'block', scale: 0.86 }),
      renderPixelPlayer({ x: 432, y: 170, tone: 'home', facing: 'right', pose: 'idle', scale: 0.82 }),
      renderArrow({ x: 188, y: 216 }, { x: 404, y: 174 }, '#fdba74'),
      '<path d="M 280 158 L 344 222" stroke="#fef08a" stroke-width="7" stroke-linecap="square" opacity="0.92" />',
      renderBall({ x: 314, y: 194, color: '#fef08a', glow: palette.glowWarning }),
      pixelRect(132, 286, 124, 16, '#4a1d1f', 0.46),
      pixelRect(378, 286, 142, 16, '#4a1d1f', 0.46)
    ].join(''))
  },
  dribble: {
    key: 'dribble',
    title: 'Drible',
    alt: 'Duelo em pixel art mostra o atacante maior encarando o marcador e puxando a bola.',
    hudLabel: 'duelo 1x1',
    mood: 'calm',
    svg: scene('Drible', 'Duelo grande: mudança seca de direção.', 'calm', 'duel', [
      renderPixelPlayer({ x: 252, y: 220, tone: 'home', facing: 'right', pose: 'run', scale: 1.5 }),
      renderPixelPlayer({ x: 360, y: 214, tone: 'away', facing: 'left', pose: 'block', scale: 1.42 }),
      renderBall({ x: 292, y: 238, glow: '#93c5fd' }),
      '<path d="M 276 236 C 298 206, 332 190, 366 154" fill="none" stroke="#93c5fd" stroke-width="5" stroke-dasharray="10 6" opacity="0.94" />',
      renderDuelBurst(318, 204, '#bbf7d0')
    ].join(''))
  },
  'defensive-duel': {
    key: 'defensive-duel',
    title: 'Disputa defensiva',
    alt: 'Duelo em pixel art mostra defensor e atacante em choque direto corpo a corpo.',
    hudLabel: 'choque físico',
    mood: 'warning',
    svg: scene('Disputa defensiva', 'Duelo grande: contenção no corpo.', 'warning', 'duel', [
      renderPixelPlayer({ x: 258, y: 218, tone: 'away', facing: 'right', pose: 'block', scale: 1.48 }),
      renderPixelPlayer({ x: 360, y: 218, tone: 'home', facing: 'left', pose: 'protect', scale: 1.48 }),
      renderBall({ x: 310, y: 238, glow: palette.glowWarning }),
      '<circle cx="310" cy="208" r="40" fill="none" stroke="#fde68a" stroke-width="4" stroke-dasharray="6 8" opacity="0.86" />',
      renderDuelBurst(310, 204, '#fcd34d')
    ].join(''))
  },
  shot: {
    key: 'shot',
    title: 'Chute',
    alt: 'Duelo em pixel art mostra finalização grande contra o goleiro com o gol em destaque.',
    hudLabel: 'finalização tensa',
    mood: 'danger',
    svg: scene('Chute', 'Duelo grande: finalização armada na cara do gol.', 'danger', 'duel', [
      renderGoal('right'),
      renderPixelPlayer({ x: 292, y: 220, tone: 'home', facing: 'right', pose: 'shoot', scale: 1.46 }),
      renderPixelPlayer({ x: 518, y: 196, tone: 'goalkeeper', facing: 'left', pose: 'block', scale: 1.42 }),
      renderArrow({ x: 326, y: 210 }, { x: 548, y: 182 }, '#fde047'),
      renderBall({ x: 418, y: 196, trailTo: { x: 324, y: 210 }, glow: palette.glowDanger })
    ].join(''))
  },
  'goalkeeper-save': {
    key: 'goalkeeper-save',
    title: 'Defesa do goleiro',
    alt: 'Duelo em pixel art mostra o goleiro se atirando grande na bola para salvar o time.',
    hudLabel: 'reflexo máximo',
    mood: 'warning',
    svg: scene('Defesa do goleiro', 'Duelo grande: voo do goleiro no quadro.', 'warning', 'duel', [
      renderGoal('right'),
      renderPixelPlayer({ x: 274, y: 224, tone: 'home', facing: 'right', pose: 'shoot', scale: 1.4 }),
      `<g transform="translate(516 182) rotate(-18)">${renderPixelPlayer({ x: 0, y: 0, tone: 'goalkeeper', facing: 'left', pose: 'dive', scale: 1.42 })}</g>`,
      renderBall({ x: 546, y: 148, trailTo: { x: 322, y: 208 }, color: '#fef08a', glow: palette.glowWarning })
    ].join(''))
  },
  goal: {
    key: 'goal',
    title: 'Gol',
    alt: 'Duelo em pixel art mostra a bola na rede e o goleiro vencido, com energia de celebração.',
    hudLabel: 'rede balançando',
    mood: 'success',
    svg: scene('Gol', 'Duelo grande: a bola morre na rede.', 'success', 'duel', [
      renderGoal('right'),
      renderPixelPlayer({ x: 286, y: 220, tone: 'home', facing: 'right', pose: 'celebrate', scale: 1.44 }),
      `<g transform="translate(526 202) rotate(68)">${renderPixelPlayer({ x: 0, y: 0, tone: 'goalkeeper', facing: 'left', pose: 'dive', scale: 1.34 })}</g>`,
      renderBall({ x: 592, y: 178, color: '#fef08a', glow: palette.glowSuccess }),
      '<path d="M 570 148 q 24 28 4 62" fill="none" stroke="#86efac" stroke-width="6" opacity="0.92" />'
    ].join(''))
  },
  rebound: {
    key: 'rebound',
    title: 'Rebote',
    alt: 'Duelo em pixel art mostra a segunda bola viva dentro da área com vários jogadores próximos.',
    hudLabel: 'bola viva',
    mood: 'warning',
    svg: scene('Rebote', 'Duelo grande: sobra perigosa na área.', 'warning', 'duel', [
      renderGoal('right'),
      renderPixelPlayer({ x: 344, y: 220, tone: 'home', facing: 'right', pose: 'run', scale: 1.3 }),
      renderPixelPlayer({ x: 454, y: 212, tone: 'away', facing: 'left', pose: 'block', scale: 1.22 }),
      renderPixelPlayer({ x: 542, y: 194, tone: 'goalkeeper', facing: 'left', pose: 'block', scale: 1.14 }),
      renderBall({ x: 486, y: 236, trailTo: { x: 542, y: 186 }, color: '#fef08a', glow: palette.glowWarning }),
      renderDuelBurst(488, 220, '#fcd34d')
    ].join(''))
  },
  'corner-kick': {
    key: 'corner-kick',
    title: 'Escanteio',
    alt: 'Mapa tático ampliado mostra a trajetória da bola aérea saindo da bandeira até a área.',
    hudLabel: 'bola parada aérea',
    mood: 'warning',
    svg: scene('Escanteio', 'Mapa grande: cruzamento fechado na área.', 'warning', 'map', [
      renderGoal('right'),
      renderCornerFlag(),
      renderPixelPlayer({ x: 96, y: 284, tone: 'home', facing: 'right', pose: 'shoot', scale: 0.92 }),
      renderPixelPlayer({ x: 478, y: 170, tone: 'away', facing: 'left', pose: 'block', scale: 0.88 }),
      renderPixelPlayer({ x: 530, y: 194, tone: 'goalkeeper', facing: 'left', pose: 'block', scale: 0.9 }),
      renderBall({ x: 98, y: 258, trailTo: { x: 88, y: 270 }, glow: palette.glowWarning }),
      '<path d="M 98 258 Q 260 84, 542 170" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="8 8" opacity="0.88" />'
    ].join(''))
  },
  'penalty-kick': {
    key: 'penalty-kick',
    title: 'Pênalti',
    alt: 'Duelo em pixel art mostra cobrador e goleiro bem grandes frente a frente para a cobrança.',
    hudLabel: 'mano a mano total',
    mood: 'danger',
    svg: scene('Pênalti', 'Duelo grande: silêncio antes da cobrança.', 'danger', 'duel', [
      renderGoal('right'),
      renderPixelPlayer({ x: 336, y: 222, tone: 'home', facing: 'right', pose: 'shoot', scale: 1.42 }),
      renderPixelPlayer({ x: 546, y: 188, tone: 'goalkeeper', facing: 'left', pose: 'block', scale: 1.42 }),
      renderBall({ x: 444, y: 226, glow: palette.glowDanger }),
      '<circle cx="444" cy="226" r="28" fill="none" stroke="#fde047" stroke-width="4" opacity="0.9" />'
    ].join(''))
  },
  fallback: {
    key: 'fallback',
    title: 'Lance em andamento',
    alt: 'Mapa tático ampliado mantém a leitura geral do campo para qualquer contexto genérico.',
    hudLabel: 'mapa vivo',
    mood: 'calm',
    svg: scene('Lance em andamento', 'Mapa grande: leitura genérica do turno.', 'calm', 'map', [
      renderPixelPlayer({ x: 236, y: 220, tone: 'home', facing: 'right', pose: 'run', scale: 0.9 }),
      renderPixelPlayer({ x: 390, y: 186, tone: 'away', facing: 'left', pose: 'block', scale: 0.9 }),
      renderPixelPlayer({ x: 470, y: 224, tone: 'home', facing: 'right', pose: 'idle', scale: 0.82 }),
      renderBall({ x: 320, y: 198, glow: '#bbf7d0' }),
      renderArrow({ x: 256, y: 210 }, { x: 304, y: 198 }, '#bbf7d0')
    ].join(''))
  }
};
