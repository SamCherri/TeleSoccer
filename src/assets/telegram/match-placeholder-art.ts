import { MatchActionKey, MatchPossessionSide, MatchSceneKey } from '../../domain/match/types';

export interface MatchPlaceholderTheme {
  background: string;
  panel: string;
  panelAlt: string;
  border: string;
  text: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
  energy: string;
  home: string;
  away: string;
  goalkeeper: string;
  accent: string;
  pitch: string;
  pitchLine: string;
}

export interface MatchPlaceholderIconAsset {
  key: MatchActionKey;
  label: string;
  shortLabel: string;
  accent: string;
  glyph: string;
  replacementSlot: string;
  finalArtPrompt: string;
}

export interface MatchPlaceholderScenePrompt {
  key: MatchSceneKey;
  replacementSlot: string;
  finalArtPrompt: string;
}

export const matchPlaceholderTheme: MatchPlaceholderTheme = {
  background: '#08131f',
  panel: '#0f2233',
  panelAlt: '#123048',
  border: '#244964',
  text: '#f8fbff',
  muted: '#98b7ce',
  success: '#37d67a',
  warning: '#ffd43b',
  danger: '#ff6b6b',
  energy: '#00d0ff',
  home: '#2f9bff',
  away: '#ff5d73',
  goalkeeper: '#ffb100',
  accent: '#7ef0c6',
  pitch: '#1f8f5a',
  pitchLine: '#e9fff3'
};

const iconGlyphs: Record<MatchActionKey, string> = {
  [MatchActionKey.Pass]: '<path d="M22 34 L60 20 L78 34 L40 48 Z" fill="currentColor" /><circle cx="24" cy="34" r="8" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Dribble]: '<path d="M28 56 C38 26, 50 24, 68 18" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="10 10" /><circle cx="30" cy="58" r="8" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Shoot]: '<path d="M18 56 L76 24" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M60 18 L82 20 L72 38" fill="currentColor" />',
  [MatchActionKey.Control]: '<rect x="22" y="20" width="44" height="44" rx="14" fill="currentColor" /><circle cx="44" cy="42" r="12" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Protect]: '<path d="M44 16 L72 28 V44 C72 60 60 70 44 76 C28 70 16 60 16 44 V28 Z" fill="currentColor" /><circle cx="44" cy="44" r="10" fill="#ffffff" opacity="0.9" />',
  [MatchActionKey.Tackle]: '<path d="M18 54 L42 34 L74 20" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M22 20 L40 34 L24 50" fill="currentColor" />',
  [MatchActionKey.Clear]: '<path d="M22 58 L74 18" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M64 14 L82 18 L76 34" fill="currentColor" />',
  [MatchActionKey.Save]: '<path d="M18 56 Q44 22 72 18" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" /><circle cx="64" cy="22" r="10" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Punch]: '<path d="M20 50 L40 28 L64 22" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><rect x="58" y="16" width="20" height="20" rx="6" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Catch]: '<circle cx="44" cy="42" r="18" fill="#ffffff" opacity="0.95" /><path d="M20 44 Q44 70 68 44" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" />',
  [MatchActionKey.RushOut]: '<path d="M18 56 L42 34 L70 16" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><circle cx="72" cy="18" r="8" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.Rebound]: '<path d="M22 26 L62 26 L62 58" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" /><path d="M54 42 L72 60 L52 68" fill="currentColor" />',
  [MatchActionKey.DistributeHand]: '<path d="M20 56 C32 36, 46 28, 74 20" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" /><circle cx="74" cy="20" r="8" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.DistributeFoot]: '<path d="M20 58 L68 28" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><circle cx="68" cy="28" r="8" fill="#ffffff" opacity="0.92" />',
  [MatchActionKey.AimLowLeft]: '<path d="M74 18 L24 54" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M26 40 L18 60 L38 58" fill="currentColor" />',
  [MatchActionKey.AimLowRight]: '<path d="M18 18 L68 54" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M54 58 L74 60 L66 40" fill="currentColor" />',
  [MatchActionKey.AimHighLeft]: '<path d="M74 58 L24 22" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M18 18 L26 38 L38 20" fill="currentColor" />',
  [MatchActionKey.AimHighRight]: '<path d="M18 58 L68 22" stroke="currentColor" stroke-width="8" stroke-linecap="round" /><path d="M54 20 L66 38 L74 18" fill="currentColor" />'
};

const buildPrompt = (subject: string, accent: string) =>
  `TeleSoccer final art, football mobile UI, fast readability, high contrast, clean vector look, 1:1 icon badge, ${subject}, accent ${accent}, transparent background, replace placeholder keeping visual weight and safe margins.`;

const iconMeta = (key: MatchActionKey, label: string, shortLabel: string, accent: string): MatchPlaceholderIconAsset => ({
  key,
  label,
  shortLabel,
  accent,
  glyph: iconGlyphs[key],
  replacementSlot: `telegram.match.action-icon.${key.toLowerCase()}`,
  finalArtPrompt: buildPrompt(label, accent)
});

export const matchActionPlaceholderIcons: Record<MatchActionKey, MatchPlaceholderIconAsset> = {
  [MatchActionKey.Pass]: iconMeta(MatchActionKey.Pass, 'Passar', 'Passe', '#7ef0c6'),
  [MatchActionKey.Dribble]: iconMeta(MatchActionKey.Dribble, 'Driblar', 'Drible', '#79b8ff'),
  [MatchActionKey.Shoot]: iconMeta(MatchActionKey.Shoot, 'Finalizar', 'Chute', '#ffd43b'),
  [MatchActionKey.Control]: iconMeta(MatchActionKey.Control, 'Dominar', 'Domínio', '#74c0fc'),
  [MatchActionKey.Protect]: iconMeta(MatchActionKey.Protect, 'Proteger', 'Proteção', '#c0eb75'),
  [MatchActionKey.Tackle]: iconMeta(MatchActionKey.Tackle, 'Dar bote', 'Bote', '#ff8787'),
  [MatchActionKey.Clear]: iconMeta(MatchActionKey.Clear, 'Afastar', 'Alívio', '#ffa94d'),
  [MatchActionKey.Save]: iconMeta(MatchActionKey.Save, 'Defender', 'Defesa', '#ffb100'),
  [MatchActionKey.Punch]: iconMeta(MatchActionKey.Punch, 'Espalmar', 'Soco', '#ffb100'),
  [MatchActionKey.Catch]: iconMeta(MatchActionKey.Catch, 'Segurar', 'Encaixe', '#ffb100'),
  [MatchActionKey.RushOut]: iconMeta(MatchActionKey.RushOut, 'Sair do gol', 'Saída', '#ffb100'),
  [MatchActionKey.Rebound]: iconMeta(MatchActionKey.Rebound, 'Rebater', 'Rebote', '#ffd43b'),
  [MatchActionKey.DistributeHand]: iconMeta(MatchActionKey.DistributeHand, 'Reposição com a mão', 'Mão', '#7ef0c6'),
  [MatchActionKey.DistributeFoot]: iconMeta(MatchActionKey.DistributeFoot, 'Reposição com o pé', 'Pé', '#7ef0c6'),
  [MatchActionKey.AimLowLeft]: iconMeta(MatchActionKey.AimLowLeft, 'Mirar baixo esquerdo', '↙ baixa', '#ffd43b'),
  [MatchActionKey.AimLowRight]: iconMeta(MatchActionKey.AimLowRight, 'Mirar baixo direito', '↘ baixa', '#ffd43b'),
  [MatchActionKey.AimHighLeft]: iconMeta(MatchActionKey.AimHighLeft, 'Mirar alto esquerdo', '↖ alta', '#ffd43b'),
  [MatchActionKey.AimHighRight]: iconMeta(MatchActionKey.AimHighRight, 'Mirar alto direito', '↗ alta', '#ffd43b')
};

export const matchScenePlaceholderPrompts: Record<MatchSceneKey, MatchPlaceholderScenePrompt> = {
  'pass-received': { key: 'pass-received', replacementSlot: 'telegram.match.scene.pass-received', finalArtPrompt: 'TeleSoccer final art, football mobile scene, 16:9 card, passer and receiver, lane open, bright pitch, high-contrast UI composition, leave top HUD safe area.' },
  'pass-intercepted': { key: 'pass-intercepted', replacementSlot: 'telegram.match.scene.pass-intercepted', finalArtPrompt: 'TeleSoccer final art, football mobile scene, defender cutting passing lane, 16:9, strong contrast, dynamic interception, leave HUD and bottom action safe areas.' },
  dribble: { key: 'dribble', replacementSlot: 'telegram.match.scene.dribble', finalArtPrompt: 'TeleSoccer final art, football mobile scene, attacker beating marker in 1v1, 16:9, fast readability, clear ball path.' },
  'defensive-duel': { key: 'defensive-duel', replacementSlot: 'telegram.match.scene.defensive-duel', finalArtPrompt: 'TeleSoccer final art, football mobile scene, defensive duel shoulder-to-shoulder, 16:9, readable silhouettes, strong contrast.' },
  shot: { key: 'shot', replacementSlot: 'telegram.match.scene.shot', finalArtPrompt: 'TeleSoccer final art, football mobile scene, shot on goal, goalkeeper in frame, 16:9, dramatic but readable, safe margins for HUD.' },
  'goalkeeper-save': { key: 'goalkeeper-save', replacementSlot: 'telegram.match.scene.goalkeeper-save', finalArtPrompt: 'TeleSoccer final art, football mobile scene, goalkeeper save, 16:9, gloves and ball highlighted, clear goal frame.' },
  goal: { key: 'goal', replacementSlot: 'telegram.match.scene.goal', finalArtPrompt: 'TeleSoccer final art, football mobile scene, goal with ball in net, 16:9, celebratory energy, readable at Telegram size.' },
  rebound: { key: 'rebound', replacementSlot: 'telegram.match.scene.rebound', finalArtPrompt: 'TeleSoccer final art, football mobile scene, loose ball rebound in the box, 16:9, multiple nearby players, readable second-ball moment.' },
  'corner-kick': { key: 'corner-kick', replacementSlot: 'telegram.match.scene.corner-kick', finalArtPrompt: 'TeleSoccer final art, football mobile scene, corner kick trajectory to the box, 16:9, flag and penalty area visible.' },
  'penalty-kick': { key: 'penalty-kick', replacementSlot: 'telegram.match.scene.penalty-kick', finalArtPrompt: 'TeleSoccer final art, football mobile scene, penalty kick duel, 16:9, kicker, goalkeeper, goal centered, strong contrast.' },
  fallback: { key: 'fallback', replacementSlot: 'telegram.match.scene.fallback', finalArtPrompt: 'TeleSoccer final art, football mobile scene, generic match moment, 16:9, pitch and ball readable, reserved space for HUD and action chips.' }
};

export const renderMiniPitchPlaceholder = (possessionSide: MatchPossessionSide, ballX = 50, ballY = 50): string => {
  const sideColor = possessionSide === MatchPossessionSide.Home ? matchPlaceholderTheme.home : matchPlaceholderTheme.away;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" role="img">
      <rect width="220" height="140" rx="18" fill="${matchPlaceholderTheme.pitch}" />
      <rect x="10" y="10" width="200" height="120" rx="14" fill="none" stroke="${matchPlaceholderTheme.pitchLine}" stroke-width="3" opacity="0.88" />
      <line x1="110" y1="10" x2="110" y2="130" stroke="${matchPlaceholderTheme.pitchLine}" stroke-width="2" opacity="0.7" />
      <circle cx="110" cy="70" r="18" fill="none" stroke="${matchPlaceholderTheme.pitchLine}" stroke-width="2" opacity="0.7" />
      <rect x="10" y="38" width="28" height="64" fill="none" stroke="${matchPlaceholderTheme.pitchLine}" stroke-width="2" opacity="0.7" />
      <rect x="182" y="38" width="28" height="64" fill="none" stroke="${matchPlaceholderTheme.pitchLine}" stroke-width="2" opacity="0.7" />
      <circle cx="${20 + (ballX / 100) * 180}" cy="${20 + (ballY / 100) * 100}" r="8" fill="#ffffff" stroke="#08131f" stroke-width="2" />
      <circle cx="62" cy="52" r="8" fill="${matchPlaceholderTheme.home}" opacity="0.92" />
      <circle cx="86" cy="82" r="8" fill="${matchPlaceholderTheme.home}" opacity="0.92" />
      <circle cx="154" cy="56" r="8" fill="${matchPlaceholderTheme.away}" opacity="0.92" />
      <circle cx="138" cy="88" r="8" fill="${matchPlaceholderTheme.away}" opacity="0.92" />
      <rect x="14" y="14" width="64" height="18" rx="9" fill="#08131f" opacity="0.7" />
      <text x="46" y="27" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="${sideColor}">POSSE ${possessionSide}</text>
    </svg>
  `.trim();
};
