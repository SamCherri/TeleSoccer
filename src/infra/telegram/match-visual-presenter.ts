import { MatchContextType, MatchPossessionSide, MatchStatus, MatchSummary } from '../../domain/match/types';
import type { BotReplyScene } from '../../bot/phase1-bot';
import { buildMatchCardViewModel } from '../../view-models/game-view-models';
import { renderTelegramMatchPlaceholderCard } from '../../presentation/telegram-match-placeholder-renderer';

export interface TelegramMatchPresentation {
  text: string;
  scene?: BotReplyScene;
}

const possessionLabelMap: Record<MatchPossessionSide, string> = {
  [MatchPossessionSide.Home]: 'HOME',
  [MatchPossessionSide.Away]: 'AWAY'
};

const contextLabelMap: Record<MatchContextType, string> = {
  [MatchContextType.ReceivedFree]: 'recebeu livre',
  [MatchContextType.ReceivedPressed]: 'recebeu pressionado',
  [MatchContextType.BackToGoal]: 'de costas para o gol',
  [MatchContextType.InBox]: 'na área',
  [MatchContextType.DefensiveDuel]: 'duelo defensivo',
  [MatchContextType.GoalkeeperSave]: 'chance para o goleiro',
  [MatchContextType.PenaltyKick]: 'pênalti',
  [MatchContextType.FreeKick]: 'bola parada',
  [MatchContextType.CornerKick]: 'escanteio'
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const stripTrailingPeriod = (value: string): string => value.replace(/[.!?…。]+$/u, '').trim();

const summarizePreviousOutcome = (value?: string): string => {
  if (!value) {
    return 'abertura de nova jogada';
  }

  return truncate(stripTrailingPeriod(value), 96);
};

const buildHudLine = (match: MatchSummary): string => {
  const contextLabel = match.activeTurn ? contextLabelMap[match.activeTurn.contextType] : 'encerrado';
  const possessionLabel = match.activeTurn ? possessionLabelMap[match.activeTurn.possessionSide] : possessionLabelMap[match.scoreboard.homeScore >= match.scoreboard.awayScore ? MatchPossessionSide.Home : MatchPossessionSide.Away];

  return [
    `⚽ ${match.scoreboard.homeScore}x${match.scoreboard.awayScore}`,
    `⏱️ ${match.scoreboard.minute}'`,
    `⚡ ${match.energy}`,
    `🧭 ${possessionLabel}`,
    `🎯 ${contextLabel}`
  ].join(' • ');
};

const buildSummaryText = (match: MatchSummary): string => {
  const viewModel = buildMatchCardViewModel(match);
  const lines = [
    buildHudLine(match),
    `${viewModel.scene.title} — ${truncate(stripTrailingPeriod(viewModel.scene.phrase), 84)}`,
    `Último resultado: ${summarizePreviousOutcome(match.activeTurn?.previousOutcome)}`
  ];

  if (match.status === MatchStatus.Finished || !match.activeTurn) {
    lines.push('Partida sem lance pendente; use o menu para seguir sua jornada.');
  }

  return lines.join('\n');
};

export const presentTelegramMatchVisual = (match: MatchSummary): TelegramMatchPresentation => {
  const viewModel = buildMatchCardViewModel(match);
  const text = buildSummaryText(match);
  const placeholderCard = renderTelegramMatchPlaceholderCard(match);

  return {
    text,
    scene: {
      key: viewModel.scene.asset.key,
      title: viewModel.scene.title,
      hud: buildHudLine(match),
      phrase: truncate(stripTrailingPeriod(viewModel.scene.phrase), 84),
      svg: placeholderCard.svg,
      fallbackText: `Cena alternativa: ${viewModel.scene.fallback}`,
      assetKeys: placeholderCard.assetKeys,
      replacementSlots: placeholderCard.replacementSlots
    }
  };
};
