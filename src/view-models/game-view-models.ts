import { MatchHalf, MatchSummary, MatchTurnView } from '../domain/match/types';
import { MultiplayerParticipantKind, MultiplayerSessionSummary, MultiplayerSquadRole, MultiplayerTeamSide } from '../domain/multiplayer/types';

const halfLabelMap: Record<MatchHalf, string> = {
  [MatchHalf.First]: '1º tempo',
  [MatchHalf.Second]: '2º tempo',
  [MatchHalf.Extra]: 'Prorrogação',
  [MatchHalf.Penalties]: 'Pênaltis'
};

const sideIconMap: Record<MultiplayerTeamSide, string> = {
  [MultiplayerTeamSide.Home]: '🏠',
  [MultiplayerTeamSide.Away]: '✈️'
};

const roleLabelMap: Record<MultiplayerSquadRole, string> = {
  [MultiplayerSquadRole.Starter]: 'Titulares',
  [MultiplayerSquadRole.Substitute]: 'Reservas'
};

export interface MatchCardViewModel {
  headline: string;
  scoreboard: string;
  details: string[];
  events: string[];
  currentPlay?: string[];
}

export interface MultiplayerParticipantViewModel {
  label: string;
}

export interface MultiplayerSquadCardViewModel {
  title: string;
  subtitle: string;
  starters: MultiplayerParticipantViewModel[];
  substitutes: MultiplayerParticipantViewModel[];
}

export interface MultiplayerSessionCardViewModel {
  headline: string;
  sessionCode: string;
  status: string;
  policy: string;
  readiness: string;
  matchup: string;
  sideSummaries: string[];
  fallback: string;
}

export interface MultiplayerPreparationCardViewModel {
  title: string;
  readiness: string;
  notes: string[];
}

const formatParticipant = (name: string, kind: MultiplayerParticipantKind, isHost: boolean, isCaptain: boolean, slotNumber: number): string => {
  const badges = [kind === MultiplayerParticipantKind.Human ? '🧑' : '🤖'];
  if (isHost) {
    badges.push('HOST');
  }
  if (isCaptain) {
    badges.push('CAP');
  }

  return `${slotNumber}. ${name} [${badges.join(' · ')}]`;
};

export const buildMultiplayerSquadCardViewModel = (session: MultiplayerSessionSummary, side: MultiplayerTeamSide): MultiplayerSquadCardViewModel => {
  const summary = side === MultiplayerTeamSide.Home ? session.home : session.away;

  return {
    title: `${sideIconMap[side]} ${side}`,
    subtitle: `${summary.humanCount} humano(s) • ${summary.botCount} bot(s) • ${summary.remainingStarterSlots} vaga(s) de titular • ${summary.remainingSubstituteSlots} vaga(s) de reserva`,
    starters: summary.starters.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    })),
    substitutes: summary.substitutes.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    }))
  };
};

export const buildMultiplayerSessionCardViewModel = (session: MultiplayerSessionSummary): MultiplayerSessionCardViewModel => ({
  headline: '🏟️ TeleSoccer Online | Sessão multiplayer humano-first',
  sessionCode: session.code,
  status: `Status: ${session.status}`,
  policy: `Preenchimento: ${session.fillPolicy}`,
  readiness: session.canPrepareMatch
    ? 'Prontidão: confronto pronto para preparação.'
    : `Prontidão: faltam ${session.missingHumansToStart} humano(s) para atingir o mínimo e fechar os elencos.`,
  matchup: `HOME ${session.home.startersCount + session.home.substitutesCount} x ${session.away.startersCount + session.away.substitutesCount} AWAY`,
  sideSummaries: [
    `HOME | humanos ${session.home.humanCount} | bots ${session.home.botCount} | titulares ${session.home.startersCount}/${session.maxStartersPerSide} | reservas ${session.home.substitutesCount}/${session.maxSubstitutesPerSide} | vagas ${session.home.remainingStarterSlots + session.home.remainingSubstituteSlots}`,
    `AWAY | humanos ${session.away.humanCount} | bots ${session.away.botCount} | titulares ${session.away.startersCount}/${session.maxStartersPerSide} | reservas ${session.away.substitutesCount}/${session.maxSubstitutesPerSide} | vagas ${session.away.remainingStarterSlots + session.away.remainingSubstituteSlots}`
  ],
  fallback: session.canUseBotFallback
    ? `Fallback: ${session.fallbackEligibleOpenSlots} vaga(s) aberta(s) ainda elegíveis para bots.`
    : 'Fallback: bots desativados ou sem vagas elegíveis no momento.'
});

export const buildMultiplayerPreparationCardViewModel = (session: MultiplayerSessionSummary): MultiplayerPreparationCardViewModel => ({
  title: `⚔️ Preparação do confronto | HOME vs AWAY | código ${session.code}`,
  readiness: session.canPrepareMatch
    ? 'A sessão já tem base humana mínima para avançar rumo à partida compartilhada.'
    : 'A sessão ainda precisa de mais humanos titulares/reservas antes de preparar o confronto.',
  notes: [
    `HOME: ${session.home.humanCount} humano(s), ${session.home.botCount} bot(s), ${session.home.startersCount} titular(es), ${session.home.substitutesCount} reserva(s).`,
    `AWAY: ${session.away.humanCount} humano(s), ${session.away.botCount} bot(s), ${session.away.startersCount} titular(es), ${session.away.substitutesCount} reserva(s).`,
    session.canUseBotFallback
      ? `Ainda existem ${session.fallbackEligibleOpenSlots} slot(s) elegíveis para fallback controlado.`
      : 'Não há slots elegíveis para fallback no estado atual.',
    session.missingHumansToStart > 0
      ? `Faltam ${session.missingHumansToStart} humano(s) para atingir o mínimo configurado.`
      : 'Mínimo humano atingido para a preparação.'
  ]
});

const turnText = (turn: MatchTurnView): string[] => [
  `🎯 Lance ${turn.sequence}: ${turn.contextText}`,
  turn.previousOutcome ? `Último desfecho: ${turn.previousOutcome}` : 'Último desfecho: abertura de nova jogada.',
  `Prazo do turno: ${turn.deadlineAt.toISOString()}`
];

export const buildMatchCardViewModel = (match: MatchSummary): MatchCardViewModel => ({
  headline: '🎮 TeleSoccer Match Center',
  scoreboard: `${match.scoreboard.homeClubName} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${match.scoreboard.awayClubName}`,
  details: [
    `⏱️ ${match.scoreboard.minute}' • ${halfLabelMap[match.scoreboard.half]} • status ${match.scoreboard.status}`,
    `⚡ Energia ${match.energy} • 🟨 ${match.yellowCards} • 🟥 ${match.redCards} • suspensão ${match.suspensionMatchesRemaining}`,
    match.injury
      ? `🩺 Lesão ativa: ${match.injury.description} (${match.injury.matchesRemaining} partida(s) restantes)`
      : '🩺 Lesão ativa: nenhuma registrada.'
  ],
  events: match.recentEvents.slice(0, 5).map((event) => `${event.minute}' ${event.description}`),
  currentPlay: match.activeTurn ? turnText(match.activeTurn) : undefined
});

export const squadSectionTitle = roleLabelMap;
