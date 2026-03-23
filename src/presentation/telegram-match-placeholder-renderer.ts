import { MatchSummary, MatchPossessionSide } from '../domain/match/types';
import { buildMatchCardViewModel } from '../view-models/game-view-models';
import { matchActionPlaceholderIcons, matchScenePlaceholderPrompts, renderMiniPitchPlaceholder } from '../assets/telegram/match-placeholder-art';

const svgToDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const truncate = (value: string, max: number): string => (value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`);

const panel = (x: number, y: number, width: number, height: number, fill: string, stroke = '#111827') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="34" fill="${fill}" stroke="${stroke}" stroke-width="3" />`;

const renderActionChip = (x: number, y: number, label: string, iconSvg: string, accent: string): string => `
  <g transform="translate(${x} ${y})">
    <rect width="286" height="82" rx="24" fill="#ffffff" stroke="#111827" stroke-width="2.5" />
    <circle cx="44" cy="41" r="22" fill="${accent}" opacity="0.18" />
    <g transform="translate(8 8)" style="color:${accent}">${iconSvg}</g>
    <text x="84" y="34" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#111827">${escapeXml(label)}</text>
    <text x="84" y="56" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#6b7280">AÇÃO DISPONÍVEL</text>
  </g>
`;

export interface TelegramMatchPlaceholderRender {
  svg: string;
  assetKeys: string[];
  replacementSlots: string[];
}

export const renderTelegramMatchPlaceholderCard = (match: MatchSummary): TelegramMatchPlaceholderRender => {
  const viewModel = buildMatchCardViewModel(match);
  const turn = match.activeTurn;
  const sceneKey = viewModel.scene.asset.key;
  const scenePrompt = matchScenePlaceholderPrompts[sceneKey];
  const actionIcons = (turn?.availableActions ?? []).slice(0, 4).map((action) => matchActionPlaceholderIcons[action.key]);
  const sceneDataUri = svgToDataUri(viewModel.scene.svg);
  const miniPitchDataUri = svgToDataUri(renderMiniPitchPlaceholder(turn?.possessionSide ?? MatchPossessionSide.Home, 58, 52));
  const previousOutcome = truncate(turn?.previousOutcome ?? 'Nova jogada aberta para decisão imediata.', 120);
  const heroText = truncate(viewModel.scene.phrase, 72);
  const lowerText = truncate(frameToNarrative(viewModel.scene.frames.at(-1)?.narration ?? previousOutcome), 84);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1620" role="img">
      <defs>
        <linearGradient id="heroGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#16324a" />
          <stop offset="100%" stop-color="#0c1a29" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1620" fill="#d8ead0" />
      <rect x="20" y="20" width="1040" height="1580" rx="56" fill="#c0ddb9" opacity="0.66" />
      ${panel(36, 30, 1008, 1560, '#f9fafb', '#101828')}

      ${panel(72, 72, 936, 126, 'url(#heroGradient)', '#101828')}
      <text x="108" y="126" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#d0e8ff">TELESOCCER • MATCH HUD PLACEHOLDER</text>
      <text x="108" y="166" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${escapeXml(match.scoreboard.homeClubName)} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${escapeXml(match.scoreboard.awayClubName)}</text>
      <text x="828" y="122" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#ffe066">⚡ ${match.energy}</text>
      <text x="828" y="150" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#ffffff">⏱️ ${match.scoreboard.minute}'</text>
      <text x="828" y="178" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#9ae6b4">🎯 ${escapeXml(viewModel.scene.title.toUpperCase())}</text>

      <image x="72" y="226" width="936" height="742" preserveAspectRatio="xMidYMid slice" href="${sceneDataUri}" />
      <rect x="72" y="226" width="936" height="742" rx="34" fill="none" stroke="#101828" stroke-width="3" />

      ${panel(72, 1000, 936, 268, '#ffffff', '#111827')}
      <text x="108" y="1040" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#6b7280">CARD VISUAL DO LANCE</text>
      <text x="540" y="1088" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#111827">${escapeXml(heroText)}</text>
      <text x="540" y="1148" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#111827">${escapeXml(lowerText)}</text>
      <text x="540" y="1198" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#6b7280">slot de troca futura: ${escapeXml(scenePrompt.replacementSlot)}</text>
      <text x="108" y="1238" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#9ca3af">telegram.match.widget.play-card</text>

      ${panel(72, 1298, 290, 218, '#ffffff', '#111827')}
      <text x="106" y="1354" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111827">MINI CAMPO</text>
      <image x="104" y="1384" width="220" height="108" preserveAspectRatio="xMidYMid meet" href="${miniPitchDataUri}" />
      <text x="104" y="1510" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#6b7280">telegram.match.widget.mini-pitch</text>

      ${panel(390, 1298, 618, 218, '#ffffff', '#111827')}
      <text x="426" y="1354" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111827">AÇÕES PRINCIPAIS</text>
      ${actionIcons.map((icon, index) => renderActionChip(426 + (index % 2) * 292, 1382 + Math.floor(index / 2) * 90, icon.shortLabel, icon.glyph, icon.accent)).join('')}

      <text x="86" y="1560" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#6b7280">Último resultado: ${escapeXml(previousOutcome)}</text>
      <text x="860" y="1560" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#9ca3af">09:22</text>
    </svg>
  `.trim();

  return {
    svg,
    assetKeys: ['match-hud-placeholder', 'match-play-card-placeholder', 'match-mini-pitch-placeholder', ...actionIcons.map((icon) => `match-action-icon-${icon.key.toLowerCase()}`), `match-scene-${sceneKey}`],
    replacementSlots: ['telegram.match.widget.hud', 'telegram.match.widget.play-card', 'telegram.match.widget.mini-pitch', scenePrompt.replacementSlot, ...actionIcons.map((icon) => icon.replacementSlot)]
  };
};

const frameToNarrative = (value: string): string => value.replace(/[.!?]+$/u, '').trim();
