import { MatchSummary, MatchPossessionSide } from '../domain/match/types';
import { buildMatchCardViewModel } from '../view-models/game-view-models';
import { matchActionPlaceholderIcons, matchPlaceholderTheme, matchScenePlaceholderPrompts, renderMiniPitchPlaceholder } from '../assets/telegram/match-placeholder-art';

const svgToDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const truncate = (value: string, max: number): string => (value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`);

const panel = (x: number, y: number, width: number, height: number, fill = matchPlaceholderTheme.panel) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="${fill}" stroke="${matchPlaceholderTheme.border}" stroke-width="3" />`;

const renderActionBadge = (x: number, y: number, label: string, iconSvg: string, accent: string): string => `
  <g transform="translate(${x} ${y})">
    <rect width="220" height="84" rx="24" fill="${matchPlaceholderTheme.panelAlt}" stroke="${matchPlaceholderTheme.border}" stroke-width="2" />
    <circle cx="42" cy="42" r="24" fill="${accent}" opacity="0.16" />
    <g transform="translate(6 6)" style="color:${accent}">${iconSvg}</g>
    <text x="84" y="36" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${matchPlaceholderTheme.text}">${escapeXml(label)}</text>
    <text x="84" y="58" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="${matchPlaceholderTheme.muted}">AÇÃO VISÍVEL</text>
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
  const actionIcons = (turn?.availableActions ?? []).slice(0, 3).map((action) => matchActionPlaceholderIcons[action.key]);
  const sceneDataUri = svgToDataUri(viewModel.scene.svg);
  const miniPitchDataUri = svgToDataUri(renderMiniPitchPlaceholder(turn?.possessionSide ?? MatchPossessionSide.Home, 58, 52));
  const previousOutcome = truncate(turn?.previousOutcome ?? 'Nova jogada aberta para decisão imediata.', 110);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" role="img">
      <rect width="1080" height="1350" rx="42" fill="${matchPlaceholderTheme.background}" />
      <defs>
        <linearGradient id="heroGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#16324a" />
          <stop offset="100%" stop-color="#0c1a29" />
        </linearGradient>
      </defs>
      ${panel(36, 34, 1008, 132, 'url(#heroGradient)')}
      <text x="72" y="86" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="${matchPlaceholderTheme.muted}">TELESOCCER • MATCH HUD PLACEHOLDER</text>
      <text x="72" y="132" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="${matchPlaceholderTheme.text}">${escapeXml(match.scoreboard.homeClubName)} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${escapeXml(match.scoreboard.awayClubName)}</text>
      <text x="836" y="90" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${matchPlaceholderTheme.energy}">⚡ ENERGIA ${match.energy}</text>
      <text x="836" y="122" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${matchPlaceholderTheme.warning}">⏱️ ${match.scoreboard.minute}'</text>
      <text x="836" y="154" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${matchPlaceholderTheme.accent}">🎯 ${escapeXml(viewModel.scene.title.toUpperCase())}</text>

      ${panel(36, 190, 1008, 720)}
      <text x="72" y="238" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">CARD VISUAL DO LANCE</text>
      <text x="72" y="272" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${matchPlaceholderTheme.muted}">${escapeXml(viewModel.scene.phrase)}</text>
      <image x="72" y="306" width="936" height="526" preserveAspectRatio="xMidYMid slice" href="${sceneDataUri}" />
      <rect x="72" y="306" width="936" height="526" rx="30" fill="none" stroke="${matchPlaceholderTheme.border}" stroke-width="3" />
      <text x="72" y="872" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${matchPlaceholderTheme.muted}">slot de troca futura: ${escapeXml(scenePrompt.replacementSlot)}</text>

      ${panel(36, 942, 360, 332)}
      <text x="72" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">MINI CAMPO</text>
      <text x="72" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Leitura rápida de posse e setor do lance</text>
      <image x="72" y="1048" width="288" height="184" preserveAspectRatio="xMidYMid meet" href="${miniPitchDataUri}" />
      <text x="72" y="1252" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">placeholder slot: telegram.match.widget.mini-pitch</text>

      ${panel(430, 942, 614, 332)}
      <text x="466" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">AÇÕES PRINCIPAIS</text>
      <text x="466" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Ícones técnicos para leitura instantânea no Telegram</text>
      ${actionIcons.map((icon, index) => renderActionBadge(466 + (index % 2) * 250, 1046 + Math.floor(index / 2) * 98, icon.shortLabel, icon.glyph, icon.accent)).join('')}
      <text x="466" y="1252" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Último resultado: ${escapeXml(previousOutcome)}</text>
      <text x="466" y="1278" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">slots de troca futura: ${escapeXml(actionIcons.map((icon) => icon.replacementSlot).join(', ') || 'telegram.match.action-icon.none')}</text>
    </svg>
  `.trim();

  return {
    svg,
    assetKeys: ['match-hud-placeholder', 'match-play-card-placeholder', 'match-mini-pitch-placeholder', ...actionIcons.map((icon) => `match-action-icon-${icon.key.toLowerCase()}`), `match-scene-${sceneKey}`],
    replacementSlots: ['telegram.match.widget.hud', 'telegram.match.widget.play-card', 'telegram.match.widget.mini-pitch', scenePrompt.replacementSlot, ...actionIcons.map((icon) => icon.replacementSlot)]
  };
};
