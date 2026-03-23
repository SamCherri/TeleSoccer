import { MatchSummary, MatchPossessionSide, MatchSceneKey } from '../domain/match/types';
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

const chip = (x: number, y: number, width: number, label: string, fill: string, textColor = matchPlaceholderTheme.text): string => `
  <g transform="translate(${x} ${y})">
    <rect width="${width}" height="34" rx="10" fill="${fill}" stroke="${matchPlaceholderTheme.borderStrong}" stroke-width="1.5" />
    <text x="${Math.round(width / 2)}" y="22" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${textColor}">${escapeXml(label)}</text>
  </g>
`;

const renderCrowdBand = (): string => `
  <g opacity="0.95">
    <rect x="0" y="0" width="1080" height="108" fill="${matchPlaceholderTheme.crowd}" />
    <path d="M0 80 C90 48, 160 116, 244 76 S404 42, 492 82 S650 112, 740 74 S898 48, 1080 88 L1080 108 L0 108 Z" fill="${matchPlaceholderTheme.backgroundAlt}" opacity="0.9" />
    <path d="M0 92 C102 70, 184 128, 286 92 S478 52, 580 90 S770 130, 876 92 S994 68, 1080 96 L1080 108 L0 108 Z" fill="${matchPlaceholderTheme.panelSoft}" opacity="0.88" />
    <rect x="126" y="26" width="48" height="12" fill="#ffffff" opacity="0.06" />
    <rect x="302" y="20" width="40" height="12" fill="#ffffff" opacity="0.05" />
    <rect x="828" y="22" width="52" height="12" fill="#ffffff" opacity="0.06" />
    <rect x="960" y="18" width="34" height="12" fill="#ffffff" opacity="0.05" />
  </g>
`;

const renderActionBadge = (x: number, y: number, label: string, iconSvg: string, accent: string): string => `
  <g transform="translate(${x} ${y})">
    <rect width="220" height="84" rx="18" fill="${matchPlaceholderTheme.panelAlt}" stroke="${matchPlaceholderTheme.borderStrong}" stroke-width="2" />
    <rect x="10" y="10" width="56" height="56" rx="14" fill="${accent}" opacity="0.14" />
    <rect x="18" y="18" width="40" height="40" rx="10" fill="${matchPlaceholderTheme.pixelInk}" opacity="0.5" />
    <g transform="translate(6 6)" style="color:${accent}">${iconSvg}</g>
    <text x="84" y="34" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="${matchPlaceholderTheme.text}">${escapeXml(label)}</text>
    <text x="84" y="55" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="${matchPlaceholderTheme.muted}">DECISÃO DISPONÍVEL</text>
    <rect x="84" y="62" width="96" height="10" rx="5" fill="${accent}" opacity="0.2" />
  </g>
`;

const duelFocusedScenes: MatchSceneKey[] = ['dribble', 'defensive-duel', 'shot', 'goalkeeper-save', 'goal', 'rebound', 'penalty-kick'];

const getSceneLayoutMode = (sceneKey: MatchSceneKey): 'duel' | 'map' => (duelFocusedScenes.includes(sceneKey) ? 'duel' : 'map');

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
  const layoutMode = getSceneLayoutMode(sceneKey);
  const sceneDataUri = svgToDataUri(viewModel.scene.svg);
  const miniPitchDataUri = svgToDataUri(renderMiniPitchPlaceholder(turn?.possessionSide ?? MatchPossessionSide.Home, 58, 52));
  const previousOutcome = truncate(turn?.previousOutcome ?? 'Nova jogada aberta para decisão imediata.', 110);
  const isDuel = layoutMode === 'duel';

  const lowerLeftPanelTitle = isDuel ? 'MINI CAMPO TÁTICO' : 'MAPA TÁTICO AMPLIADO';
  const lowerLeftPanelSubtitle = isDuel
    ? 'Leitura complementar de posse e setor por trás do duelo.'
    : 'Campo grande priorizado para lances de circulação e leitura posicional.';
  const stageTitle = isDuel ? 'CARD VISUAL DO LANCE' : 'MAPA VIVO DO LANCE';
  const stageSubtitle = isDuel
    ? 'Modo duelo: pixel art grande destaca o confronto principal.'
    : 'Modo mapa: o mini-campo cresce para liderar a leitura do turno.';
  const modeChip = isDuel ? 'MODO DUELO SNES' : 'MODO MAPA SNES';

  const lowerLeftPanel = isDuel
    ? `${panel(36, 942, 360, 332, matchPlaceholderTheme.panel)}
      <text x="72" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">${lowerLeftPanelTitle}</text>
      <text x="72" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">${lowerLeftPanelSubtitle}</text>
      <image x="72" y="1048" width="288" height="184" preserveAspectRatio="xMidYMid meet" href="${miniPitchDataUri}" />
      ${chip(72, 1240, 270, 'placeholder slot: telegram.match.widget.mini-pitch', 'rgba(248, 251, 255, 0.05)', matchPlaceholderTheme.muted)}`
    : `${panel(36, 942, 614, 332, matchPlaceholderTheme.panel)}
      <text x="72" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">${lowerLeftPanelTitle}</text>
      <text x="72" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">${lowerLeftPanelSubtitle}</text>
      <image x="72" y="1042" width="542" height="198" preserveAspectRatio="xMidYMid meet" href="${miniPitchDataUri}" />
      ${chip(72, 1240, 318, 'placeholder slot: telegram.match.widget.mini-pitch', 'rgba(248, 251, 255, 0.05)', matchPlaceholderTheme.muted)}
      ${chip(402, 1240, 212, 'leitura: circulação/tocar a bola', 'rgba(126, 240, 198, 0.08)', matchPlaceholderTheme.accent)}`;

  const actionPanel = isDuel
    ? `${panel(430, 942, 614, 332)}
      <text x="466" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">AÇÕES PRINCIPAIS</text>
      <text x="466" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Decisões do jogador destacadas como comandos de partida</text>
      ${actionIcons.map((icon, index) => renderActionBadge(466 + (index % 2) * 250, 1046 + Math.floor(index / 2) * 98, icon.shortLabel, icon.glyph, icon.accent)).join('')}
      <text x="466" y="1252" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Leitura narrativa: ${escapeXml(previousOutcome)}</text>
      <text x="466" y="1278" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">slots de troca futura: ${escapeXml(actionIcons.map((icon) => icon.replacementSlot).join(', ') || 'telegram.match.action-icon.none')}</text>`
    : `${panel(684, 942, 360, 332)}
      <text x="720" y="990" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">AÇÕES PRINCIPAIS</text>
      <text x="720" y="1022" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">Comandos ficam compactos quando o mapa domina a leitura</text>
      ${actionIcons.map((icon, index) => renderActionBadge(720, 1046 + index * 88, icon.shortLabel, icon.glyph, icon.accent)).join('')}
      <text x="720" y="1314" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="${matchPlaceholderTheme.muted}">slots: ${escapeXml(actionIcons.map((icon) => icon.replacementSlot).join(', ') || 'telegram.match.action-icon.none')}</text>`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" role="img">
      <rect width="1080" height="1350" rx="42" fill="${matchPlaceholderTheme.background}" />
      <rect width="1080" height="240" fill="${matchPlaceholderTheme.backgroundAlt}" opacity="0.92" />
      ${renderCrowdBand()}
      <defs>
        <linearGradient id="heroGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#17324a" />
          <stop offset="65%" stop-color="#11283a" />
          <stop offset="100%" stop-color="#0b1723" />
        </linearGradient>
        <linearGradient id="stageGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${matchPlaceholderTheme.panelSoft}" />
          <stop offset="100%" stop-color="${matchPlaceholderTheme.panel}" />
        </linearGradient>
      </defs>
      ${panel(36, 34, 1008, 164, 'url(#heroGradient)')}
      <rect x="36" y="34" width="1008" height="164" rx="28" fill="${matchPlaceholderTheme.text}" opacity="0.03" />
      <text x="72" y="78" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="${matchPlaceholderTheme.accentSoft}">TELESOCCER • LIVE MATCHDAY PREVIEW</text>
      <text x="72" y="128" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="${matchPlaceholderTheme.text}">${escapeXml(match.scoreboard.homeClubName)} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${escapeXml(match.scoreboard.awayClubName)}</text>
      <text x="72" y="160" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${matchPlaceholderTheme.muted}">${escapeXml(viewModel.scene.phrase)}</text>
      ${chip(72, 174, 162, `⚡ ENERGIA ${match.energy}`, 'rgba(71, 215, 255, 0.12)', matchPlaceholderTheme.energy)}
      ${chip(246, 174, 120, `⏱️ ${match.scoreboard.minute}'`, 'rgba(255, 212, 59, 0.14)', matchPlaceholderTheme.warning)}
      ${chip(378, 174, 214, `🎯 ${viewModel.scene.title.toUpperCase()}`, 'rgba(126, 240, 198, 0.14)', matchPlaceholderTheme.accent)}
      ${chip(604, 174, 182, modeChip, 'rgba(248, 251, 255, 0.06)', matchPlaceholderTheme.text)}
      <text x="934" y="76" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${matchPlaceholderTheme.muted}">MATCH HUD PLACEHOLDER</text>
      <text x="934" y="106" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.home}">HOME ${match.scoreboard.homeScore}</text>
      <text x="934" y="132" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.away}">AWAY ${match.scoreboard.awayScore}</text>
      <text x="934" y="158" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${matchPlaceholderTheme.muted}">TURNO VIVO</text>

      ${panel(36, 224, 1008, 684, 'url(#stageGradient)')}
      <rect x="72" y="272" width="936" height="586" rx="34" fill="${matchPlaceholderTheme.shadow}" opacity="0.55" />
      <text x="72" y="274" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${matchPlaceholderTheme.text}">${stageTitle}</text>
      <text x="72" y="306" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${matchPlaceholderTheme.muted}">${stageSubtitle}</text>
      <image x="72" y="334" width="936" height="526" preserveAspectRatio="xMidYMid slice" href="${sceneDataUri}" />
      <rect x="72" y="334" width="936" height="526" rx="30" fill="none" stroke="${matchPlaceholderTheme.borderStrong}" stroke-width="3" />
      <rect x="72" y="334" width="936" height="96" rx="30" fill="${matchPlaceholderTheme.background}" opacity="0.16" />
      <text x="102" y="386" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="${matchPlaceholderTheme.text}">${escapeXml(viewModel.scene.title)}</text>
      <text x="102" y="414" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="${matchPlaceholderTheme.accentSoft}">${isDuel ? 'MOMENTO PRINCIPAL • close-up em pixel art do confronto' : 'MOMENTO PRINCIPAL • mapa ampliado do turno e da circulação'}</text>
      ${chip(72, 874, 272, `slot futuro: ${scenePrompt.replacementSlot}`, 'rgba(248, 251, 255, 0.06)', matchPlaceholderTheme.muted)}
      ${chip(356, 874, 248, `último lance: ${truncate(previousOutcome, 24)}`, 'rgba(126, 240, 198, 0.10)', matchPlaceholderTheme.text)}
      ${chip(616, 874, 180, isDuel ? 'foco: confronto' : 'foco: posicionamento', 'rgba(255, 255, 255, 0.06)', matchPlaceholderTheme.text)}

      ${lowerLeftPanel}
      ${actionPanel}
    </svg>
  `.trim();

  return {
    svg,
    assetKeys: ['match-hud-placeholder', 'match-play-card-placeholder', 'match-mini-pitch-placeholder', ...actionIcons.map((icon) => `match-action-icon-${icon.key.toLowerCase()}`), `match-scene-${sceneKey}`],
    replacementSlots: ['telegram.match.widget.hud', 'telegram.match.widget.play-card', 'telegram.match.widget.mini-pitch', scenePrompt.replacementSlot, ...actionIcons.map((icon) => icon.replacementSlot)]
  };
};
