import {
  buildMatchCardViewModel,
  buildMultiplayerPreparationCardViewModel,
  buildMultiplayerSessionCardViewModel,
  buildMultiplayerSquadCardViewModel,
  squadSectionTitle
} from '../view-models/game-view-models';
import { MatchSummary } from '../domain/match/types';
import { MultiplayerSessionSummary, MultiplayerTeamSide } from '../domain/multiplayer/types';

const renderBlock = (title: string, lines: string[]): string => [title, ...lines].join('\n');

export class GameCardRenderer {
  renderMatchCard(match: MatchSummary): string {
    const viewModel = buildMatchCardViewModel(match);
    return [
      viewModel.headline,
      '━━━━━━━━━━━━━━━━━━',
      viewModel.scoreboard,
      ...viewModel.details,
      viewModel.currentPlay ? renderBlock('Lance atual', viewModel.currentPlay) : 'Lance atual\nSem lance pendente.',
      viewModel.events.length > 0 ? renderBlock('Eventos recentes', viewModel.events.map((line) => `• ${line}`)) : 'Eventos recentes\n• Sem eventos.'
    ].join('\n');
  }

  renderMultiplayerSessionCard(session: MultiplayerSessionSummary): string {
    const viewModel = buildMultiplayerSessionCardViewModel(session);
    return [
      viewModel.headline,
      '━━━━━━━━━━━━━━━━━━',
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
      `${viewModel.title} | Elenco`,
      viewModel.subtitle,
      renderBlock(squadSectionTitle.STARTER, viewModel.starters.length > 0 ? viewModel.starters.map((entry) => `• ${entry.label}`) : ['• Nenhum titular definido.']),
      renderBlock(squadSectionTitle.SUBSTITUTE, viewModel.substitutes.length > 0 ? viewModel.substitutes.map((entry) => `• ${entry.label}`) : ['• Nenhum reserva definido.'])
    ].join('\n');
  }

  renderMultiplayerPreparationCard(session: MultiplayerSessionSummary): string {
    const viewModel = buildMultiplayerPreparationCardViewModel(session);
    return [viewModel.title, '━━━━━━━━━━━━━━━━━━', viewModel.readiness, ...viewModel.notes.map((line) => `• ${line}`)].join('\n');
  }
}
