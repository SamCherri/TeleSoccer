import { MatchHalf, MatchSummary, MatchTurnView } from '../domain/match/types';
import { MultiplayerParticipantKind, MultiplayerSessionStatus, MultiplayerSessionSummary, MultiplayerSquadRole, MultiplayerTeamSide } from '../domain/multiplayer/types';

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

const sessionStatusLabelMap: Record<MultiplayerSessionStatus, string> = {
  [MultiplayerSessionStatus.WaitingForPlayers]: 'Aguardando mais humanos',
  [MultiplayerSessionStatus.ReadyForFallback]: 'Cobertura liberada',
  [MultiplayerSessionStatus.ReadyToPrepare]: 'Pronta para aquecer',
  [MultiplayerSessionStatus.PreparingMatch]: 'Aquecendo elenco',
  [MultiplayerSessionStatus.Closed]: 'Encerrada'
};

export interface MatchCardViewModel {
  artwork: string;
  headline: string;
  scoreboard: string;
  clockLine: string;
  hudLine: string;
  injuryLine: string;
  playLine: string;
  promptLine: string;
  detailsHint: string;
}

export interface MatchDetailsCardViewModel {
  title: string;
  summary: string;
  deadlineLine: string;
  history: string[];
  events: string[];
}

export interface MultiplayerParticipantViewModel {
  label: string;
}

export interface MultiplayerSquadCardViewModel {
  title: string;
  subtitle: string;
  openSlots: string;
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

export interface OnlineWorldCardViewModel {
  artwork: string;
  headline: string;
  identityLine: string;
  clubLine: string;
  progressLine: string;
  liveLine: string;
  socialLine: string;
  focusLine: string;
}

export interface WeeklyAgendaCardViewModel {
  artwork: string;
  title: string;
  summary: string;
  commitments: string[];
}

const formatParticipant = (name: string, kind: MultiplayerParticipantKind, isHost: boolean, isCaptain: boolean, slotNumber: number): string => {
  const badges = [kind === MultiplayerParticipantKind.Human ? '🧑' : '🤖'];
  if (isHost) {
    badges.push('HOST');
  }
  if (isCaptain) {
    badges.push('CAP');
  }

  return `${slotNumber}. ${name} [${badges.join(' • ')}]`;
};

const summarizeInjury = (match: MatchSummary): string => {
  if (!match.injury) {
    return '🩺 Sem lesão';
  }

  if (match.injury.matchesRemaining > 0) {
    return `🩺 ${match.injury.description} • ${match.injury.matchesRemaining} jogo(s)`;
  }

  return `🩺 ${match.injury.description}`;
};

const compactSentence = (text: string, limit: number): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(limit - 1, 1)).trimEnd()}…`;
};

const currentPlayLine = (turn?: MatchTurnView): string => {
  if (!turn) {
    return '🎯 Sem lance pendente agora.';
  }

  return `🎯 ${compactSentence(turn.contextText, 80)}`;
};

const promptLine = (turn?: MatchTurnView): string => {
  if (!turn) {
    return '📡 Acompanhe o próximo momento do jogo.';
  }

  if (turn.isGoalkeeperContext) {
    return '🧤 Defesa sob pressão: escolha sua resposta.';
  }

  return '⚽ Lance decisivo: escolha sua jogada.';
};

const turnHistory = (turn?: MatchTurnView): string[] => {
  if (!turn) {
    return ['Sem turno ativo no momento.'];
  }

  return [
    `Lance ${turn.sequence} • ${halfLabelMap[turn.half]} • ${turn.minute}'.`,
    `Contexto: ${turn.contextText}`,
    turn.previousOutcome ? `Último desfecho: ${turn.previousOutcome}` : 'Último desfecho: nova jogada aberta pelo jogo.',
    `Prazo real do turno: ${turn.deadlineAt.toISOString()}`
  ];
};

export const buildMultiplayerSquadCardViewModel = (session: MultiplayerSessionSummary, side: MultiplayerTeamSide): MultiplayerSquadCardViewModel => {
  const summary = side === MultiplayerTeamSide.Home ? session.home : session.away;

  return {
    title: `${sideIconMap[side]} ${side} | Vestiário`,
    subtitle: `${summary.humanCount} humano(s) • ${summary.botCount} apoio(s) • cobertura ${summary.botFallbackEligibleOpenSlots}`,
    openSlots: `Vagas abertas: titulares ${summary.remainingStarterSlots} • reservas ${summary.remainingSubstituteSlots}`,
    starters: summary.starters.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    })),
    substitutes: summary.substitutes.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    }))
  };
};

export const buildMultiplayerSessionCardViewModel = (session: MultiplayerSessionSummary): MultiplayerSessionCardViewModel => ({
  headline: '🏟️ CONFRONTO ONLINE',
  sessionCode: session.code,
  status: `Momento: ${sessionStatusLabelMap[session.status]}`,
  policy: `Convocação: ${session.fillPolicy === 'HUMAN_ONLY' ? 'somente humanos' : 'humanos primeiro, bots só na cobertura'}`,
  readiness: session.canPrepareMatch
    ? 'Elenco pronto para seguir ao aquecimento.'
    : session.canUseBotFallbackNow
      ? 'Base humana mínima confirmada; a cobertura pode entrar.'
      : `Faltam ${session.missingHumansToStart} humano(s) para liberar o aquecimento.`,
  matchup: `HOME ${session.home.startersCount + session.home.substitutesCount} x ${session.away.startersCount + session.away.substitutesCount} AWAY`,
  sideSummaries: [
    `HOME | humanos ${session.home.humanCount} | bots ${session.home.botCount} | titulares ${session.home.startersCount}/${session.maxStartersPerSide} | reservas ${session.home.substitutesCount}/${session.maxSubstitutesPerSide}`,
    `AWAY | humanos ${session.away.humanCount} | bots ${session.away.botCount} | titulares ${session.away.startersCount}/${session.maxStartersPerSide} | reservas ${session.away.substitutesCount}/${session.maxSubstitutesPerSide}`
  ],
  fallback: session.fallbackEligibleOpenSlots > 0
    ? `Cobertura aberta: ${session.fallbackEligibleOpenSlots} vaga(s) elegível(is).`
    : 'Cobertura aberta: nenhuma vaga elegível pendente.'
});

export const buildMultiplayerPreparationCardViewModel = (session: MultiplayerSessionSummary): MultiplayerPreparationCardViewModel => ({
  title: `⚔️ AQUECIMENTO | sala ${session.code}`,
  readiness: session.canPrepareMatch
    ? 'Confronto pronto para a próxima etapa.'
    : session.canUseBotFallbackNow
      ? 'A cobertura automática já pode completar as vagas marcadas.'
      : 'A convocação ainda depende de mais base humana.',
  notes: [
    `HOME: ${session.home.humanCount} humano(s), ${session.home.botCount} apoio(s), ${session.home.startersCount} titular(es), ${session.home.substitutesCount} reserva(s).`,
    `AWAY: ${session.away.humanCount} humano(s), ${session.away.botCount} apoio(s), ${session.away.startersCount} titular(es), ${session.away.substitutesCount} reserva(s).`,
    session.hasHumanStarterOnEachSide
      ? 'Cada lado já tem ao menos um titular humano.'
      : 'Ainda falta titular humano em um dos lados.',
    session.canUseBotFallbackNow
      ? `Há ${session.fallbackEligibleOpenSlots} vaga(s) elegível(is) para cobertura automática.`
      : 'Nenhuma vaga automática pode ser preenchida agora.',
    session.missingHumansToStart > 0
      ? `Faltam ${session.missingHumansToStart} humano(s) para atingir o mínimo da sala.`
      : 'Mínimo humano atingido para esta sala.'
  ]
});

export const buildOnlineWorldCardViewModel = (input: {
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
}): OnlineWorldCardViewModel => {
  const activeMatch = input.activeMatch ?? null;
  const currentSession = input.currentSession ?? null;

  return {
    artwork: activeMatch ? '🌃⚽🏟️' : currentSession ? '🌆👥⚽' : '🌍⚽✨',
    headline: '🌍 JORNADA NO FUTEBOL',
    identityLine: `${input.playerName} • ${input.age} anos • ${input.position}`,
    clubLine: `🏠 ${input.currentClubName ?? 'Base amadora'} • ${input.careerStatus.toLowerCase()} • 💰 ${input.walletBalance}`,
    progressLine: `🗓️ Semana ${input.currentWeekNumber} • ${input.trainingAvailableThisWeek ? 'treino livre' : 'treino feito'}`,
    liveLine: activeMatch
      ? `🏟️ Jogo ao vivo: ${activeMatch.scoreboard.homeClubName} ${activeMatch.scoreboard.homeScore} x ${activeMatch.scoreboard.awayScore} ${activeMatch.scoreboard.awayClubName}`
      : input.canTryout
        ? '🥅 Sua próxima chance está na peneira regional.'
        : '🏟️ Sem jogo ao vivo agora; a rotina segue aberta.',
    socialLine: currentSession
      ? `👥 Sala ${currentSession.code} ativa • ${sessionStatusLabelMap[currentSession.status].toLowerCase()}`
      : '👥 Nenhuma convocação ativa neste momento.',
    focusLine: activeMatch
      ? '🎯 Foco do momento: voltar ao estádio.'
      : currentSession
        ? '🎯 Foco do momento: alinhar o elenco no vestiário.'
        : input.canTryout
          ? '🎯 Foco do momento: evoluir e buscar espaço no profissional.'
          : '🎯 Foco do momento: manter a rotina e preparar o próximo confronto.'
  };
};

export const buildWeeklyAgendaCardViewModel = (input: {
  playerName: string;
  currentWeekNumber: number;
  trainingAvailableThisWeek: boolean;
  careerStatus: string;
  hasActiveMatch: boolean;
  hasCurrentSession: boolean;
  canTryout: boolean;
}): WeeklyAgendaCardViewModel => ({
  artwork: '🗓️⚽📍',
  title: `🗓️ AGENDA | ${input.playerName}`,
  summary: `Semana ${input.currentWeekNumber} • ${input.trainingAvailableThisWeek ? 'treino livre' : 'treino feito'} • ${input.careerStatus.toLowerCase()}`,
  commitments: [
    input.hasActiveMatch
      ? '🏟️ Jogo ao vivo pedindo retorno imediato.'
      : '🌤️ Sem jogo ao vivo travando sua agenda.',
    input.hasCurrentSession
      ? '👥 Seu elenco compartilhado já está montado.'
      : '📣 Ainda não há convocação assumida nesta semana.',
    input.canTryout
      ? '🥅 Você pode buscar a peneira regional.'
      : '💼 Sua carreira profissional já pode focar em confronto, treino e rotina.'
  ]
});

export const buildMatchCardViewModel = (match: MatchSummary): MatchCardViewModel => ({
  artwork: '🏟️🔥⚽',
  headline: '🏟️ ESTÁDIO',
  scoreboard: `${match.scoreboard.homeClubName} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${match.scoreboard.awayClubName}`,
  clockLine: `⏱️ ${match.scoreboard.minute}' • ${halfLabelMap[match.scoreboard.half]}`,
  hudLine: `⚡ ${match.energy}   🟨 ${match.yellowCards}   🟥 ${match.redCards}`,
  injuryLine: summarizeInjury(match),
  playLine: currentPlayLine(match.activeTurn),
  promptLine: promptLine(match.activeTurn),
  detailsHint: '📖 Abra os detalhes para prazo, histórico e eventos recentes.'
});

export const buildMatchDetailsCardViewModel = (match: MatchSummary): MatchDetailsCardViewModel => ({
  title: '📖 DETALHES DO JOGO',
  summary: `${match.scoreboard.homeClubName} ${match.scoreboard.homeScore} x ${match.scoreboard.awayScore} ${match.scoreboard.awayClubName} • ${match.scoreboard.minute}' • ${halfLabelMap[match.scoreboard.half]}`,
  deadlineLine: match.activeTurn ? `⏳ Prazo do turno: ${match.activeTurn.deadlineAt.toISOString()}` : '⏳ Sem turno ativo no momento.',
  history: turnHistory(match.activeTurn),
  events: match.recentEvents.length > 0
    ? match.recentEvents.slice(0, 5).map((event) => `${event.minute}' • ${event.description}`)
    : ['Sem eventos recentes no jogo.']
});

export const squadSectionTitle = roleLabelMap;
