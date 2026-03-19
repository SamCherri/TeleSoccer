import { MatchStatus, MatchSummary } from '../domain/match/types';
import { MultiplayerParticipantKind, MultiplayerLobbyStatusView } from '../domain/multiplayer/types';

const statusLabels: Record<MatchStatus, string> = {
  [MatchStatus.Pending]: 'Pendente',
  [MatchStatus.InProgress]: 'Em andamento',
  [MatchStatus.Finished]: 'Encerrada'
};

const lobbyStatusLabels: Record<MultiplayerLobbyStatusView['status'], string> = {
  OPEN: 'Aguardando jogadores humanos',
  READY: 'Pronta para preparar a partida humana compartilhada',
  CLOSED: 'Encerrada'
};

const participantKindLabels: Record<MultiplayerParticipantKind, string> = {
  [MultiplayerParticipantKind.Human]: 'humano',
  [MultiplayerParticipantKind.Bot]: 'bot de fallback'
};

export const renderMatchCard = (match: MatchSummary, leadText: string): string => {
  const turn = match.activeTurn;
  const eventLines = match.recentEvents.slice(0, 4).map((event) => `• ${event.minute}' ${event.description}`);
  const injuryLine = match.injury
    ? `Lesão: ${match.injury.description} (${match.injury.matchesRemaining} partida(s) restantes)`
    : 'Lesão: nenhuma';

  return [
    '⚽ TELESOCCER | PARTIDA',
    `Status: ${statusLabels[match.status]}`,
    leadText,
    `${match.scoreboard.homeClubName} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${match.scoreboard.awayClubName}`,
    `Minuto ${match.scoreboard.minute}' • ${match.scoreboard.half} • Energia ${match.energy}`,
    `Cartões ${match.yellowCards}A/${match.redCards}V • Suspensão pendente ${match.suspensionMatchesRemaining}`,
    injuryLine,
    turn
      ? [
          `Lance ${turn.sequence}: ${turn.contextText}`,
          turn.previousOutcome ? `Último resultado: ${turn.previousOutcome}` : undefined,
          `Prazo: ${turn.deadlineAt.toISOString()}`
        ]
          .filter(Boolean)
          .join('\n')
      : 'Sem lance pendente no momento.',
    eventLines.length > 0 ? `Eventos recentes:\n${eventLines.join('\n')}` : 'Eventos recentes: sem registros.'
  ].join('\n');
};

export const renderMultiplayerLobbyCard = (lobby: MultiplayerLobbyStatusView, leadText: string): string => {
  const participantLines = lobby.participants.map(
    (participant) =>
      `• Slot ${participant.slotNumber}: ${participant.playerName}${participant.isHost ? ' (anfitrião)' : ''} [${participantKindLabels[participant.kind]}]`
  );

  return [
    '🎮 TELESOCCER | MULTIPLAYER MVP',
    leadText,
    `Sala: ${lobby.lobbyCode}`,
    `Estado: ${lobbyStatusLabels[lobby.status]}`,
    `Política de preenchimento: ${lobby.fillPolicy === 'HUMAN_PRIORITY_WITH_BOT_FALLBACK' ? 'humanos primeiro, bot só como fallback' : 'somente humanos'}`,
    `Participantes humanos: ${lobby.humanParticipantCount}/${lobby.maxParticipants}`,
    `Participantes bot: ${lobby.botParticipantCount}`,
    participantLines.join('\n'),
    `Vagas humanas em aberto: ${lobby.openHumanSlotCount}`,
    `Vagas elegíveis para fallback com bot: ${lobby.botFallbackEligibleSlots}`,
    lobby.readyForMatchAt ? `Pronta desde: ${lobby.readyForMatchAt.toISOString()}` : 'Preparação de partida: aguardando jogadores humanos reais.',
    lobby.canStartMatchPreparation
      ? 'Preparação multiplayer liberada para a futura partida compartilhada entre humanos.'
      : 'Enquanto houver vaga humana aberta, o sistema prioriza jogadores reais. Bot só entra por contingência futura.'
  ].join('\n');
};
