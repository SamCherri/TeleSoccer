import { buildMatchVisualSequence } from '../domain/match/visual-sequence';
import { MatchPossessionSide, MatchSummary, MatchVisualFrame } from '../domain/match/types';

const palette = {
  pitch: '#1f8f5a',
  pitchDark: '#187448',
  line: '#e9fff3',
  homePrimary: '#1c7ed6',
  awayPrimary: '#e03131',
  goalkeeperPrimary: '#f59f00',
  ball: '#ffffff',
  ballShadow: '#0f5132',
  text: '#ffffff',
  panel: '#0b1f17',
  panelAccent: '#d9fbe8',
  shadow: 'rgba(15, 23, 42, 0.28)'
} as const;

const toSvgX = (x: number) => 24 + (x / 100) * 592;
const toSvgY = (y: number) => 24 + (y / 100) * 312;

const renderPitch = () => `
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
`;

const renderPlayer = (frame: MatchVisualFrame) => frame.players.map((player) => {
  const x = toSvgX(player.x);
  const y = toSvgY(player.y);
  const fill = player.role === 'GOALKEEPER' ? palette.goalkeeperPrimary : player.side === MatchPossessionSide.Home ? palette.homePrimary : palette.awayPrimary;
  const stroke = player.isPrimaryActor ? '#fff3bf' : '#0b1f17';
  const radius = player.isPrimaryActor ? 11 : 8;
  const labelY = y - 14;
  return `
    <g>
      <circle cx="${x}" cy="${y + 7}" r="${radius + 2}" fill="${palette.shadow}" />
      <circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${player.isPrimaryActor ? 3 : 1.5}" />
      <text x="${x}" y="${labelY}" font-family="Arial, Helvetica, sans-serif" font-size="9" text-anchor="middle" fill="${palette.text}">${player.shirtNumber}</text>
      ${player.hasBall ? `<circle cx="${x}" cy="${y}" r="${radius + 5}" fill="none" stroke="#fff3bf" stroke-width="2" stroke-dasharray="4 4" />` : ''}
    </g>`;
}).join('');

const renderBall = (frame: MatchVisualFrame) => {
  const x = toSvgX(frame.ball.x);
  const y = toSvgY(frame.ball.y);
  return `
    <g>
      <circle cx="${x}" cy="${y + 6}" r="8" fill="${palette.shadow}" opacity="0.6" />
      <circle cx="${x}" cy="${y}" r="7" fill="${palette.ball}" stroke="${palette.ballShadow}" stroke-width="2" />
    </g>`;
};

const renderHud = (frame: MatchVisualFrame, totalFrames: number) => `
  <g>
    <rect x="34" y="34" width="310" height="86" rx="18" fill="${palette.panel}" opacity="0.82" />
    <text x="56" y="62" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" fill="${palette.text}">Frame ${frame.phase} • ${frame.minute}'</text>
    <text x="56" y="88" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="${palette.panelAccent}">${frame.ownerLabel ?? 'Bola em disputa'} • ${frame.sceneKey}</text>
    <text x="56" y="110" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${palette.panelAccent}">Sequência com ${totalFrames} frame(s) e 22 jogadores posicionados.</text>
  </g>
`;

export const renderMatchVisualSequenceSvg = (match: MatchSummary): string => {
  const sequence = match.visualSequence ?? buildMatchVisualSequence(match);
  const frame = sequence?.frames[sequence.frames.length - 1];
  if (!sequence || !frame) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" rx="28" fill="#1f8f5a" /><text x="40" y="60" fill="#fff" font-size="24">Sem sequência visual disponível.</text></svg>';
  }

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img">',
    renderPitch(),
    renderHud(frame, sequence.frames.length),
    renderPlayer(frame),
    renderBall(frame),
    '</svg>'
  ].join('');
};
