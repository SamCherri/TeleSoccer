import { MatchStatus, MatchSummary } from '../domain/match/types';
import { MultiplayerLobbyStatusView } from '../domain/multiplayer/types';

const statusLabels: Record<MatchStatus, string> = {
  [MatchStatus.Pending]: 'Pendente',
  [MatchStatus.InProgress]: 'Em andamento',
  [MatchStatus.Finished]: 'Encerrada'
};

const lobbyStatusLabels: Record<MultiplayerLobbyStatusView['status'], string> = {
  OPEN: 'Aguardando adversário',
  READY: 'Pronta para preparar a partida',
  CLOSED: 'Encerrada'
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
      `• Slot ${participant.slotNumber}: ${participant.playerName}${participant.isHost ? ' (anfitrião)' : ''}`
  );

  return [
    '🎮 TELESOCCER | MULTIPLAYER MVP',
    leadText,
    `Sala: ${lobby.lobbyCode}`,
    `Estado: ${lobbyStatusLabels[lobby.status]}`,
    `Participantes: ${lobby.participants.length}/2`,
    participantLines.join('\n'),
    `Vagas em aberto: ${lobby.openSlotCount}`,
    lobby.readyForMatchAt ? `Pronta desde: ${lobby.readyForMatchAt.toISOString()}` : 'Preparação de partida: aguardando segundo usuário.',
    lobby.canStartMatchPreparation
      ? 'Preparação multiplayer liberada para a próxima evolução da partida compartilhada.'
      : 'Use /entrar-sala CODIGO no segundo usuário para completar a sessão persistida.'
  ].join('\n');
};
