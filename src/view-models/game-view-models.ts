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
  [MultiplayerSessionStatus.ReadyForFallback]: 'Pronta para fallback controlado',
  [MultiplayerSessionStatus.ReadyToPrepare]: 'Pronta para preparar confronto',
  [MultiplayerSessionStatus.PreparingMatch]: 'Preparando confronto',
  [MultiplayerSessionStatus.Closed]: 'Encerrada'
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
  headline: string;
  identityLine: string;
  environmentLine: string;
  routineLine: string;
  liveMomentLine: string;
  socialLine: string;
  alerts: string[];
}

export interface WeeklyAgendaCardViewModel {
  title: string;
  summary: string;
  commitments: string[];
}

const formatParticipant = (name: string, kind: MultiplayerParticipantKind, isHost: boolean, isCaptain: boolean, slotNumber: number): string => {
  const badges = [kind === MultiplayerParticipantKind.Human ? '🧑 HUM' : '🤖 BOT'];
  if (isHost) {
    badges.push('HOST');
  }
  if (isCaptain) {
    badges.push('CAP');
  }

  return `${slotNumber}. ${name} [${badges.join(' • ')}]`;
};

export const buildMultiplayerSquadCardViewModel = (session: MultiplayerSessionSummary, side: MultiplayerTeamSide): MultiplayerSquadCardViewModel => {
  const summary = side === MultiplayerTeamSide.Home ? session.home : session.away;

  return {
    title: `${sideIconMap[side]} ${side} | Vestiário`,
    subtitle: `${summary.humanCount} humano(s) • ${summary.botCount} apoio(s) automático(s) • cobertura aberta ${summary.botFallbackEligibleOpenSlots}`,
    openSlots: `Lugares abertos: titulares ${summary.remainingStarterSlots} • reservas ${summary.remainingSubstituteSlots}`,
    starters: summary.starters.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    })),
    substitutes: summary.substitutes.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    }))
  };
};

export const buildMultiplayerSessionCardViewModel = (session: MultiplayerSessionSummary): MultiplayerSessionCardViewModel => ({
  headline: '🏟️ SALA DE CONVOCAÇÃO | CONFRONTO ONLINE',
  sessionCode: session.code,
  status: `Momento: ${sessionStatusLabelMap[session.status]}`,
  policy: `Formação do confronto: ${session.fillPolicy === 'HUMAN_ONLY' ? 'somente humanos' : 'humanos primeiro, apoio automático só na cobertura'}`,
  readiness: session.canPrepareMatch
    ? 'Situação do elenco: base humana fechada e confronto pronto para o aquecimento.'
    : session.canUseBotFallbackNow
      ? 'Situação do elenco: base humana mínima confirmada; a cobertura automática pode completar as vagas marcadas.'
      : `Situação do elenco: faltam ${session.missingHumansToStart} humano(s) para liberar o aquecimento ou a cobertura.`,
  matchup: `HOME ${session.home.startersCount + session.home.substitutesCount} x ${session.away.startersCount + session.away.substitutesCount} AWAY`,
  sideSummaries: [
    `HOME | humanos ${session.home.humanCount} | apoio automático ${session.home.botCount} | titulares ${session.home.startersCount}/${session.maxStartersPerSide} | reservas ${session.home.substitutesCount}/${session.maxSubstitutesPerSide} | cobertura aberta ${session.home.botFallbackEligibleOpenSlots}`,
    `AWAY | humanos ${session.away.humanCount} | apoio automático ${session.away.botCount} | titulares ${session.away.startersCount}/${session.maxStartersPerSide} | reservas ${session.away.substitutesCount}/${session.maxSubstitutesPerSide} | cobertura aberta ${session.away.botFallbackEligibleOpenSlots}`
  ],
  fallback: session.fallbackEligibleOpenSlots > 0
    ? `Cobertura automática aberta: ${session.fallbackEligibleOpenSlots} vaga(s) marcadas para apoio automático.`
    : 'Cobertura automática aberta: nenhuma vaga elegível pendente.'
});

export const buildMultiplayerPreparationCardViewModel = (session: MultiplayerSessionSummary): MultiplayerPreparationCardViewModel => ({
  title: `⚔️ AQUECIMENTO DO CONFRONTO | HOME vs AWAY | sala ${session.code}`,
  readiness: session.canPrepareMatch
    ? 'Confronto pronto para a próxima etapa: há base humana mínima, titulares humanos em ambos os lados e nenhuma vaga elegível de cobertura pendente.'
    : session.canUseBotFallbackNow
      ? 'A convocação já pode aplicar cobertura automática controlada antes de seguir para o confronto.'
      : 'A convocação ainda está bloqueada: faltam humanos ou titulares humanos em um dos lados.',
  notes: [
    `HOME: ${session.home.humanCount} humano(s), ${session.home.botCount} apoio(s) automático(s), ${session.home.startersCount} titular(es), ${session.home.substitutesCount} reserva(s).`,
    `AWAY: ${session.away.humanCount} humano(s), ${session.away.botCount} apoio(s) automático(s), ${session.away.startersCount} titular(es), ${session.away.substitutesCount} reserva(s).`,
    session.hasHumanStarterOnEachSide
      ? 'Cada lado já tem ao menos um titular humano.'
      : 'Ainda falta titular humano em um dos lados.',
    session.canUseBotFallbackNow
      ? `Há ${session.fallbackEligibleOpenSlots} vaga(s) elegível(is) para cobertura automática controlada.`
      : 'Nenhuma vaga de cobertura automática pode ser preenchida agora.',
    session.missingHumansToStart > 0
      ? `Faltam ${session.missingHumansToStart} humano(s) para atingir o mínimo configurado.`
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
    headline: '🌍 MUNDO DO JOGADOR | VIDA NO FUTEBOL',
    identityLine: `${input.playerName} • ${input.age} anos • ${input.position} • ${input.careerStatus}`,
    environmentLine: `Ambiente atual: ${input.currentClubName ?? 'Base amadora'} • semana ${input.currentWeekNumber} • saldo ${input.walletBalance} moedas.`,
    routineLine: input.trainingAvailableThisWeek
      ? 'Rotina da semana: seu trabalho individual ainda está disponível no centro de treinamento.'
      : 'Rotina da semana: seu trabalho individual já foi concluído e sua rotina segue para os próximos compromissos.',
    liveMomentLine: activeMatch
      ? `O que está acontecendo agora: há jogo em andamento entre ${activeMatch.scoreboard.homeClubName} e ${activeMatch.scoreboard.awayClubName}, aos ${activeMatch.scoreboard.minute}'.`
      : input.canTryout
        ? 'O que está acontecendo agora: sua próxima grande chance está nas peneiras regionais.'
        : 'O que está acontecendo agora: não há partida viva no momento, então sua rotina segue aberta para preparação e compromissos.',
    socialLine: currentSession
      ? `Ambiente social: você já está em uma convocação compartilhada na sala ${currentSession.code}, com confronto ${sessionStatusLabelMap[currentSession.status].toLowerCase()}.`
      : 'Ambiente social: nenhuma convocação ativa foi assumida por você neste momento.',
    alerts: [
      activeMatch
        ? 'Seu jogo está vivo e pode ser retomado imediatamente pelo estádio.'
        : 'Nenhum jogo ao vivo bloqueando sua rotina agora.',
      currentSession
        ? 'Seu elenco compartilhado já existe e pode seguir para o vestiário ou para o aquecimento.'
        : 'Seu próximo passo social pode ser abrir uma convocação ou responder a uma chamada do elenco.'
    ]
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
  title: `🗓️ AGENDA DA SEMANA | ${input.playerName}`,
  summary: `Semana ${input.currentWeekNumber} • momento ${input.careerStatus.toLowerCase()} • rotina ${input.trainingAvailableThisWeek ? 'com treino individual em aberto' : 'com treino individual já concluído'}.`,
  commitments: [
    input.hasActiveMatch
      ? 'Há um jogo ativo pedindo retorno imediato ao estádio.'
      : 'Nenhum jogo ao vivo está travando sua agenda neste momento.',
    input.hasCurrentSession
      ? 'Seu elenco compartilhado já está montado e pode seguir pelo vestiário.'
      : 'Ainda não há convocação compartilhada assumida para esta semana.',
    input.canTryout
      ? 'Você pode buscar uma peneira regional para tentar entrar no profissional.'
      : 'Sua carreira profissional já está ativa e a agenda pode priorizar confronto, treino e rotina.'
  ]
});

const turnText = (turn: MatchTurnView): string[] => [
  `🎯 Lance ${turn.sequence}: ${turn.contextText}`,
  turn.previousOutcome ? `Último desfecho: ${turn.previousOutcome}` : 'Último desfecho: abertura de nova jogada.',
  `Prazo do turno: ${turn.deadlineAt.toISOString()}`
];

export const buildMatchCardViewModel = (match: MatchSummary): MatchCardViewModel => ({
  headline: '🏟️ ESTÁDIO | PARTIDA EM ANDAMENTO',
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
