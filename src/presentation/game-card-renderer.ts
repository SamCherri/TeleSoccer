import {
  buildMatchCardViewModel,
  buildMultiplayerPreparationCardViewModel,
  buildMultiplayerSessionCardViewModel,
  buildMultiplayerSquadCardViewModel,
  squadSectionTitle
} from '../view-models/game-view-models';
import { MatchSummary } from '../domain/match/types';
import { MultiplayerSessionSummary, MultiplayerTeamSide } from '../domain/multiplayer/types';

const divider = '━━━━━━━━━━━━━━━━━━━━';
const renderBlock = (title: string, lines: string[]): string => [title, ...lines].join('\n');
const renderList = (lines: string[], emptyLine: string): string[] => (lines.length > 0 ? lines.map((line) => `• ${line}`) : [`• ${emptyLine}`]);

export class GameCardRenderer {
  renderMatchCard(match: MatchSummary): string {
    const viewModel = buildMatchCardViewModel(match);
    return [
      viewModel.headline,
      divider,
      viewModel.scoreboard,
      ...viewModel.details,
      viewModel.currentPlay ? renderBlock('LANCE ATUAL', viewModel.currentPlay) : 'LANCE ATUAL\nSem lance pendente.',
      viewModel.events.length > 0 ? renderBlock('EVENTOS RECENTES', viewModel.events.map((line) => `• ${line}`)) : 'EVENTOS RECENTES\n• Sem eventos.'
    ].join('\n');
  }

  renderMultiplayerSessionCard(session: MultiplayerSessionSummary): string {
    const viewModel = buildMultiplayerSessionCardViewModel(session);
    return [
      viewModel.headline,
      divider,
      `Código: ${viewModel.sessionCode}`,
      viewModel.status,
      viewModel.policy,
      viewModel.matchup,
      ...viewModel.sideSummaries,
      viewModel.fallback,
      viewModel.readiness
    ].join('\n');
  }

  renderMultiplayerSquadCard(session: MultiplayerSessionSummary, side: MultiplayerTeamSide): string {
    const viewModel = buildMultiplayerSquadCardViewModel(session, side);
    return [
      viewModel.title,
      divider,
      viewModel.subtitle,
      viewModel.openSlots,
      renderBlock(squadSectionTitle.STARTER.toUpperCase(), renderList(viewModel.starters.map((entry) => entry.label), 'Nenhum titular definido.')),
      renderBlock(squadSectionTitle.SUBSTITUTE.toUpperCase(), renderList(viewModel.substitutes.map((entry) => entry.label), 'Nenhum reserva definido.'))
    ].join('\n');
  }

  renderMultiplayerPreparationCard(session: MultiplayerSessionSummary): string {
    const viewModel = buildMultiplayerPreparationCardViewModel(session);
    return [viewModel.title, divider, viewModel.readiness, ...viewModel.notes.map((line) => `• ${line}`)].join('\n');
  }
}
