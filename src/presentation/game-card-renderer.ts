import {
  buildMatchCardViewModel,
  buildMatchDetailsCardViewModel,
  buildMultiplayerPreparationCardViewModel,
  buildMultiplayerSessionCardViewModel,
  buildMultiplayerSquadCardViewModel,
  buildOnlineWorldCardViewModel,
  buildWeeklyAgendaCardViewModel,
  squadSectionTitle
} from '../view-models/game-view-models';
import { MatchSummary } from '../domain/match/types';
import { MultiplayerSessionSummary, MultiplayerTeamSide } from '../domain/multiplayer/types';

const divider = '━━━━━━━━━━━━━━━━━━━━';
const renderBlock = (title: string, lines: string[]): string => [title, ...lines].join('\n');
const renderList = (lines: string[], emptyLine: string): string[] => (lines.length > 0 ? lines.map((line) => `• ${line}`) : [`• ${emptyLine}`]);

export class GameCardRenderer {
  renderOnlineWorldCard(input: {
    playerName: string;
    age: number;
    position: string;
    careerStatus: string;
    currentClubName?: string;
    walletBalance: number;
    currentWeekNumber: number;
    trainingAvailableThisWeek: boolean;
    activeMatch?: MatchSummary | null;
    currentSession?: MultiplayerSessionSummary | null;
    canTryout: boolean;
  }): string {
    const viewModel = buildOnlineWorldCardViewModel(input);
    return [
      viewModel.artwork,
      viewModel.headline,
      divider,
      viewModel.identityLine,
      viewModel.clubLine,
      viewModel.progressLine,
      viewModel.liveLine,
      viewModel.socialLine,
      viewModel.focusLine
    ].join('\n');
  }

  renderWeeklyAgendaCard(input: {
    playerName: string;
    currentWeekNumber: number;
    trainingAvailableThisWeek: boolean;
    careerStatus: string;
    hasActiveMatch: boolean;
    hasCurrentSession: boolean;
    canTryout: boolean;
  }): string {
    const viewModel = buildWeeklyAgendaCardViewModel(input);
    return [
      viewModel.artwork,
      viewModel.title,
      divider,
      viewModel.summary,
      ...renderList(viewModel.commitments, 'Nenhum compromisso pendente.')
    ].join('\n');
  }

  renderMatchCard(match: MatchSummary): string {
    const viewModel = buildMatchCardViewModel(match);
    return [
      viewModel.artwork,
      viewModel.headline,
      divider,
      viewModel.scoreboard,
      viewModel.clockLine,
      viewModel.hudLine,
      viewModel.injuryLine,
      viewModel.playLine,
      viewModel.promptLine,
      viewModel.detailsHint
    ].join('\n');
  }

  renderMatchDetailsCard(match: MatchSummary): string {
    const viewModel = buildMatchDetailsCardViewModel(match);
    return [
      viewModel.title,
      divider,
      viewModel.summary,
      viewModel.deadlineLine,
      renderBlock('HISTÓRICO DO LANCE', renderList(viewModel.history, 'Sem histórico disponível.')),
      renderBlock('EVENTOS RECENTES', renderList(viewModel.events, 'Sem eventos recentes.'))
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
