export type MatchSceneKey =
  | 'pass-received'
  | 'pass-intercepted'
  | 'dribble'
  | 'defensive-duel'
  | 'shot'
  | 'goalkeeper-save'
  | 'goal'
  | 'rebound'
  | 'corner-kick'
  | 'penalty-kick'
  | 'fallback';

export interface MatchSceneAsset {
  key: MatchSceneKey;
  title: string;
  alt: string;
  hudLabel: string;
  mood: 'calm' | 'warning' | 'danger' | 'success';
  svg: string;
}

type TeamTone = 'home' | 'away' | 'goalkeeper';

interface PlayerFigure {
  x: number;
  y: number;
  tone: TeamTone;
  facing?: 'left' | 'right';
  accent?: string;
}

interface BallFigure {
  x: number;
  y: number;
  trailTo?: { x: number; y: number };
  color?: string;
}

const palette = {
  pitch: '#1f8f5a',
  pitchDark: '#187448',
  line: '#e9fff3',
  homePrimary: '#1c7ed6',
  homeAccent: '#8fd3ff',
  awayPrimary: '#e03131',
  awayAccent: '#ffc9c9',
  goalkeeperPrimary: '#f59f00',
  goalkeeperAccent: '#ffe066',
  ball: '#ffffff',
  ballShadow: '#0f5132',
  goal: '#dee2e6',
  net: '#f8f9fa',
  marker: '#111827',
  shadow: 'rgba(15, 23, 42, 0.22)'
} as const;

const toneColors: Record<TeamTone, { primary: string; accent: string }> = {
  home: { primary: palette.homePrimary, accent: palette.homeAccent },
  away: { primary: palette.awayPrimary, accent: palette.awayAccent },
  goalkeeper: { primary: palette.goalkeeperPrimary, accent: palette.goalkeeperAccent }
};

const svgHeader = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img">';
const svgFooter = '</svg>';

const renderPitch = (): string => `
  <defs>
    <linearGradient id="pitchGradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.pitch}" />
      <stop offset="100%" stop-color="${palette.pitchDark}" />
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="28" fill="url(#pitchGradient)" />
  <rect x="24" y="24" width="592" height="312" rx="22" fill="none" stroke="${palette.line}" stroke-width="4" opacity="0.9" />
  <line x1="320" y1="24" x2="320" y2="336" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <circle cx="320" cy="180" r="42" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <rect x="24" y="104" width="82" height="152" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <rect x="534" y="104" width="82" height="152" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <rect x="24" y="138" width="28" height="84" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <rect x="588" y="138" width="28" height="84" fill="none" stroke="${palette.line}" stroke-width="3" opacity="0.7" />
  <circle cx="96" cy="180" r="3.5" fill="${palette.line}" opacity="0.9" />
  <circle cx="544" cy="180" r="3.5" fill="${palette.line}" opacity="0.9" />
`;

const renderGoal = (side: 'left' | 'right'): string => {
  const isRight = side === 'right';
  const x = isRight ? 590 : 18;
  const postX = isRight ? 584 : 38;
  const netX = isRight ? 596 : 12;
  const netDirection = isRight ? 1 : -1;

  return `
    <g opacity="0.96">
      <rect x="${x}" y="132" width="34" height="96" fill="${palette.goal}" opacity="0.2" />
      <line x1="${postX}" y1="132" x2="${postX}" y2="228" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${postX}" y1="132" x2="${netX}" y2="146" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${postX}" y1="228" x2="${netX}" y2="214" stroke="${palette.goal}" stroke-width="4" />
      <line x1="${netX}" y1="146" x2="${netX}" y2="214" stroke="${palette.goal}" stroke-width="4" />
      ${[0, 1, 2, 3].map((index) => {
        const offset = index * 18;
        return `<line x1="${postX}" y1="${146 + offset}" x2="${netX}" y2="${146 + offset}" stroke="${palette.net}" stroke-width="1.6" opacity="0.8" />`;
      }).join('')}
      ${[0, 1, 2].map((index) => {
        const lineX = postX + netDirection * (4 + index * 8);
        return `<line x1="${lineX}" y1="132" x2="${lineX}" y2="228" stroke="${palette.net}" stroke-width="1.3" opacity="0.72" />`;
      }).join('')}
    </g>
  `;
};

const renderPlayer = ({ x, y, tone, facing = 'right', accent }: PlayerFigure): string => {
  const colors = toneColors[tone];
  const direction = facing === 'right' ? 1 : -1;
  const trim = accent ?? colors.accent;

  return `
    <g transform="translate(${x} ${y}) scale(${direction} 1)">
      <ellipse cx="0" cy="36" rx="18" ry="6" fill="${palette.shadow}" />
      <circle cx="0" cy="-18" r="10" fill="#f3d9b1" />
      <rect x="-11" y="-8" width="22" height="32" rx="10" fill="${colors.primary}" />
      <rect x="-11" y="4" width="22" height="6" rx="3" fill="${trim}" opacity="0.9" />
      <line x1="-6" y1="24" x2="-10" y2="40" stroke="${palette.marker}" stroke-width="5" stroke-linecap="round" />
      <line x1="6" y1="24" x2="10" y2="40" stroke="${palette.marker}" stroke-width="5" stroke-linecap="round" />
      <line x1="-10" y1="4" x2="-24" y2="18" stroke="${palette.marker}" stroke-width="5" stroke-linecap="round" />
      <line x1="10" y1="4" x2="24" y2="16" stroke="${palette.marker}" stroke-width="5" stroke-linecap="round" />
    </g>
  `;
};

const renderBall = ({ x, y, trailTo, color = palette.ball }: BallFigure): string => `
  <g>
    ${trailTo ? `<path d="M ${trailTo.x} ${trailTo.y} Q ${(trailTo.x + x) / 2} ${Math.min(trailTo.y, y) - 18}, ${x} ${y}" fill="none" stroke="${palette.ball}" stroke-width="4" stroke-dasharray="8 8" opacity="0.78" />` : ''}
    <circle cx="${x}" cy="${y + 7}" r="8" fill="${palette.shadow}" opacity="0.5" />
    <circle cx="${x}" cy="${y}" r="10" fill="${color}" stroke="${palette.ballShadow}" stroke-width="2" />
    <path d="M ${x - 4} ${y - 2} l4 -4 l4 4 l-2 5 h-4 z" fill="#111827" opacity="0.9" />
  </g>
`;

const renderArrow = (from: { x: number; y: number }, to: { x: number; y: number }, color: string): string => `
  <g opacity="0.92">
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="4" stroke-linecap="round" />
    <path d="M ${to.x} ${to.y} l-14 -6 l4 6 l-4 6 z" fill="${color}" />
  </g>
`;

const renderHud = (title: string, subtitle: string): string => `
  <g>
    <rect x="34" y="34" width="280" height="70" rx="18" fill="#0b1f17" opacity="0.78" />
    <text x="56" y="65" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffff">${title}</text>
    <text x="56" y="90" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#d9fbe8">${subtitle}</text>
  </g>
`;

const renderCornerFlag = (): string => `
  <g>
    <line x1="66" y1="294" x2="66" y2="82" stroke="#f8f9fa" stroke-width="4" />
    <path d="M 66 84 L 104 96 L 66 110 z" fill="#ffd43b" />
  </g>
`;

const scene = (title: string, subtitle: string, body: string): string => [svgHeader, renderPitch(), renderHud(title, subtitle), body, svgFooter].join('');

export const matchSceneAssets: Record<MatchSceneKey, MatchSceneAsset> = {
  'pass-received': {
    key: 'pass-received', title: 'Passe recebido', alt: 'Jogador faz o passe e companheiro recebe livre à frente.', hudLabel: 'circulação curta', mood: 'calm',
    svg: scene('Passe recebido', 'Troca rápida para acelerar o lance.', [renderPlayer({ x: 178, y: 198, tone: 'home', facing: 'right' }), renderPlayer({ x: 332, y: 160, tone: 'home', facing: 'right' }), renderPlayer({ x: 418, y: 176, tone: 'away', facing: 'left' }), renderArrow({ x: 200, y: 176 }, { x: 302, y: 152 }, '#d9f99d'), renderBall({ x: 318, y: 156, trailTo: { x: 218, y: 176 } })].join(''))
  },
  'pass-intercepted': {
    key: 'pass-intercepted', title: 'Passe interceptado', alt: 'Passe no corredor central é cortado por um adversário.', hudLabel: 'linha de passe cortada', mood: 'warning',
    svg: scene('Passe interceptado', 'O adversário fecha a rota e corta a bola.', [renderPlayer({ x: 166, y: 214, tone: 'home', facing: 'right' }), renderPlayer({ x: 320, y: 164, tone: 'away', facing: 'left', accent: '#ffe3e3' }), renderPlayer({ x: 430, y: 142, tone: 'home', facing: 'right' }), renderArrow({ x: 186, y: 190 }, { x: 396, y: 150 }, '#ffd8a8'), '<path d="M 286 124 L 354 194" stroke="#fff3bf" stroke-width="7" stroke-linecap="round" opacity="0.92" />', renderBall({ x: 320, y: 162, color: '#fff3bf' })].join(''))
  },
  dribble: {
    key: 'dribble', title: 'Drible', alt: 'Atacante conduz a bola e passa pelo marcador.', hudLabel: 'condução em velocidade', mood: 'calm',
    svg: scene('Drible', 'Mudança de direção para escapar da marcação.', [renderPlayer({ x: 248, y: 214, tone: 'home', facing: 'right' }), renderPlayer({ x: 318, y: 198, tone: 'away', facing: 'left' }), renderBall({ x: 274, y: 228 }), '<path d="M 246 224 C 268 192, 304 182, 334 144" fill="none" stroke="#91a7ff" stroke-width="5" stroke-dasharray="10 7" opacity="0.9" />'].join(''))
  },
  'defensive-duel': {
    key: 'defensive-duel', title: 'Disputa defensiva', alt: 'Defensor enquadra o adversário em um bote direto.', hudLabel: 'duelo corpo a corpo', mood: 'warning',
    svg: scene('Disputa defensiva', 'Linha de contenção ativa no setor.', [renderPlayer({ x: 258, y: 200, tone: 'away', facing: 'right' }), renderPlayer({ x: 340, y: 200, tone: 'home', facing: 'left' }), renderBall({ x: 300, y: 220 }), '<circle cx="300" cy="202" r="40" fill="none" stroke="#fff3bf" stroke-width="4" stroke-dasharray="6 8" opacity="0.84" />'].join(''))
  },
  shot: {
    key: 'shot', title: 'Chute', alt: 'Atacante finaliza em direção ao gol.', hudLabel: 'finalização armada', mood: 'danger',
    svg: scene('Chute', 'A bola sai forte na direção do gol.', [renderGoal('right'), renderPlayer({ x: 318, y: 206, tone: 'home', facing: 'right' }), renderPlayer({ x: 514, y: 188, tone: 'goalkeeper', facing: 'left' }), renderArrow({ x: 334, y: 206 }, { x: 556, y: 176 }, '#ffec99'), renderBall({ x: 424, y: 194, trailTo: { x: 336, y: 206 } })].join(''))
  },
  'goalkeeper-save': {
    key: 'goalkeeper-save', title: 'Defesa do goleiro', alt: 'Goleiro se estica e faz a defesa.', hudLabel: 'mão firme no lance', mood: 'warning',
    svg: scene('Defesa do goleiro', 'Reflexo rápido para manter o placar.', [renderGoal('right'), renderPlayer({ x: 286, y: 212, tone: 'home', facing: 'right' }), '<g transform="translate(524 170) rotate(-18)">' + renderPlayer({ x: 0, y: 0, tone: 'goalkeeper', facing: 'left' }) + '</g>', renderBall({ x: 548, y: 144, trailTo: { x: 330, y: 206 }, color: '#fff3bf' })].join(''))
  },
  goal: {
    key: 'goal', title: 'Gol', alt: 'Bola entra no gol enquanto o goleiro fica vencido.', hudLabel: 'rede balançando', mood: 'success',
    svg: scene('Gol', 'A jogada termina com a bola dentro da rede.', [renderGoal('right'), renderPlayer({ x: 298, y: 218, tone: 'home', facing: 'right' }), '<g transform="translate(526 198) rotate(70)">' + renderPlayer({ x: 0, y: 0, tone: 'goalkeeper', facing: 'left' }) + '</g>', renderBall({ x: 596, y: 176, color: '#fff3bf' }), '<path d="M 576 146 q 20 30 0 60" fill="none" stroke="#fff3bf" stroke-width="5" opacity="0.9" />'].join(''))
  },
  rebound: {
    key: 'rebound', title: 'Rebote', alt: 'Bola sobra viva na área após bloqueio ou defesa.', hudLabel: 'segunda bola viva', mood: 'warning',
    svg: scene('Rebote', 'A sobra na área pede reação imediata.', [renderGoal('right'), renderPlayer({ x: 352, y: 210, tone: 'home', facing: 'right' }), renderPlayer({ x: 476, y: 196, tone: 'away', facing: 'left' }), renderPlayer({ x: 544, y: 182, tone: 'goalkeeper', facing: 'left' }), renderBall({ x: 498, y: 228, trailTo: { x: 544, y: 176 }, color: '#fff3bf' })].join(''))
  },
  'corner-kick': {
    key: 'corner-kick', title: 'Escanteio', alt: 'Cobrança de escanteio sai da bandeirinha para a área.', hudLabel: 'bola aérea na área', mood: 'warning',
    svg: scene('Escanteio', 'Cruzamento fechado saindo da bandeira.', [renderGoal('right'), renderCornerFlag(), renderPlayer({ x: 88, y: 280, tone: 'home', facing: 'right' }), renderPlayer({ x: 470, y: 160, tone: 'away', facing: 'left' }), renderPlayer({ x: 530, y: 190, tone: 'goalkeeper', facing: 'left' }), renderBall({ x: 94, y: 260, trailTo: { x: 84, y: 268 } }), '<path d="M 96 260 Q 260 88, 538 166" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="8 8" opacity="0.85" />'].join(''))
  },
  'penalty-kick': {
    key: 'penalty-kick', title: 'Pênalti', alt: 'Cobrador e goleiro ficam posicionados para a cobrança.', hudLabel: 'duelo direto com o goleiro', mood: 'danger',
    svg: scene('Pênalti', 'Cobrador, bola e goleiro prontos para o confronto.', [renderGoal('right'), renderPlayer({ x: 348, y: 210, tone: 'home', facing: 'right' }), renderPlayer({ x: 548, y: 182, tone: 'goalkeeper', facing: 'left' }), renderBall({ x: 454, y: 222 }), '<circle cx="454" cy="222" r="28" fill="none" stroke="#fff3bf" stroke-width="4" opacity="0.88" />'].join(''))
  },
  fallback: {
    key: 'fallback', title: 'Lance em andamento', alt: 'Campo estilizado com bola em destaque para lance genérico.', hudLabel: 'cena genérica', mood: 'calm',
    svg: scene('Lance em andamento', 'Base visual pronta para qualquer contexto do turno.', [renderPlayer({ x: 248, y: 210, tone: 'home', facing: 'right' }), renderPlayer({ x: 390, y: 176, tone: 'away', facing: 'left' }), renderBall({ x: 320, y: 196 })].join(''))
  }
};
