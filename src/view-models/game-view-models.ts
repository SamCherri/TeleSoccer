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
  playerLine: string;
  worldLine: string;
  matchLine: string;
  sessionLine: string;
  guidance: string[];
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
    title: `${sideIconMap[side]} ${side} | Elenco`,
    subtitle: `${summary.humanCount} humano(s) • ${summary.botCount} bot(s) • fallback aberto ${summary.botFallbackEligibleOpenSlots}`,
    openSlots: `Vagas: titulares ${summary.remainingStarterSlots} • reservas ${summary.remainingSubstituteSlots}`,
    starters: summary.starters.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    })),
    substitutes: summary.substitutes.map((participant) => ({
      label: formatParticipant(participant.playerName, participant.kind, participant.isHost, participant.isCaptain, participant.slotNumber)
    }))
  };
};

export const buildMultiplayerSessionCardViewModel = (session: MultiplayerSessionSummary): MultiplayerSessionCardViewModel => ({
  headline: '🏟️ TELESOCCER ONLINE | SALA MULTIPLAYER',
  sessionCode: session.code,
  status: `Status: ${sessionStatusLabelMap[session.status]}`,
  policy: `Política: ${session.fillPolicy === 'HUMAN_ONLY' ? 'Somente humanos' : 'Humanos primeiro, bot só no fallback'}`,
  readiness: session.canPrepareMatch
    ? 'Prontidão: base humana fechada e sessão pronta para preparação do confronto.'
    : session.canUseBotFallbackNow
      ? 'Prontidão: humanos mínimos confirmados; fallback elegível pode completar as vagas marcadas.'
      : `Prontidão: faltam ${session.missingHumansToStart} humano(s) para liberar a preparação ou o fallback.`,
  matchup: `HOME ${session.home.startersCount + session.home.substitutesCount} x ${session.away.startersCount + session.away.substitutesCount} AWAY`,
  sideSummaries: [
    `HOME | humanos ${session.home.humanCount} | bots ${session.home.botCount} | titulares ${session.home.startersCount}/${session.maxStartersPerSide} | reservas ${session.home.substitutesCount}/${session.maxSubstitutesPerSide} | fallback aberto ${session.home.botFallbackEligibleOpenSlots}`,
    `AWAY | humanos ${session.away.humanCount} | bots ${session.away.botCount} | titulares ${session.away.startersCount}/${session.maxStartersPerSide} | reservas ${session.away.substitutesCount}/${session.maxSubstitutesPerSide} | fallback aberto ${session.away.botFallbackEligibleOpenSlots}`
  ],
  fallback: session.fallbackEligibleOpenSlots > 0
    ? `Fallback total aberto: ${session.fallbackEligibleOpenSlots} slot(s) marcados para bot.`
    : 'Fallback total aberto: nenhum slot elegível pendente.'
});

export const buildMultiplayerPreparationCardViewModel = (session: MultiplayerSessionSummary): MultiplayerPreparationCardViewModel => ({
  title: `⚔️ PREPARAÇÃO DE CONFRONTO | HOME vs AWAY | sala ${session.code}`,
  readiness: session.canPrepareMatch
    ? 'Confronto pronto para a próxima etapa: há base humana mínima, titulares humanos em ambos os lados e nenhuma vaga elegível de fallback pendente.'
    : session.canUseBotFallbackNow
      ? 'Sessão apta a aplicar fallback controlado antes de seguir para o confronto.'
      : 'Sessão ainda bloqueada: faltam humanos ou titulares humanos em um dos lados.',
  notes: [
    `HOME: ${session.home.humanCount} humano(s), ${session.home.botCount} bot(s), ${session.home.startersCount} titular(es), ${session.home.substitutesCount} reserva(s).`,
    `AWAY: ${session.away.humanCount} humano(s), ${session.away.botCount} bot(s), ${session.away.startersCount} titular(es), ${session.away.substitutesCount} reserva(s).`,
    session.hasHumanStarterOnEachSide
      ? 'Cada lado já tem ao menos um titular humano.'
      : 'Ainda falta titular humano em um dos lados.',
    session.canUseBotFallbackNow
      ? `Há ${session.fallbackEligibleOpenSlots} vaga(s) elegível(is) para fallback controlado.`
      : 'Nenhuma vaga de fallback pode ser preenchida agora.',
    session.missingHumansToStart > 0
      ? `Faltam ${session.missingHumansToStart} humano(s) para atingir o mínimo configurado.`
      : 'Mínimo humano atingido para esta sala.'
  ]
});

export const buildOnlineWorldCardViewModel = (input: {
  playerName: string;
  careerStatus: string;
  currentClubName?: string;
  activeMatch?: MatchSummary | null;
  currentSession?: MultiplayerSessionSummary | null;
}): OnlineWorldCardViewModel => {
  const activeMatch = input.activeMatch ?? null;
  const currentSession = input.currentSession ?? null;

  return {
    headline: '🌍 TELESOCCER MMORPG | MUNDO DO JOGADOR',
    playerLine: `Jogador: ${input.playerName} • status ${input.careerStatus} • clube ${input.currentClubName ?? 'Base amadora'}`,
    worldLine: activeMatch || currentSession
      ? 'Mundo online unificado: sua carreira, suas partidas e sua sessão compartilhada convivem no mesmo fluxo.'
      : 'Mundo online unificado: avance a carreira para entrar em partidas e sessões compartilhadas sem trocar de modo.',
    matchLine: activeMatch
      ? `Partida ativa: ${activeMatch.scoreboard.homeClubName} ${activeMatch.scoreboard.homeScore} x ${activeMatch.scoreboard.awayScore} ${activeMatch.scoreboard.awayClubName} aos ${activeMatch.scoreboard.minute}'.`
      : 'Partida ativa: nenhuma partida em andamento para este jogador agora.',
    sessionLine: currentSession
      ? `Sessão compartilhada: sala ${currentSession.code} • status ${sessionStatusLabelMap[currentSession.status]} • HOME ${currentSession.home.startersCount + currentSession.home.substitutesCount} x ${currentSession.away.startersCount + currentSession.away.substitutesCount} AWAY.`
      : 'Sessão compartilhada: você ainda não participa de uma sala ativa.',
    guidance: [
      activeMatch
        ? 'Use Entrar em partida para voltar ao lance atual quando quiser.'
        : 'Use Entrar em partida para jogar sua carreira imediatamente quando estiver profissional.',
      currentSession
        ? 'Use Ver sessão atual para acompanhar o elenco e preparar o confronto compartilhado.'
        : 'Use Criar sessão online para abrir uma sala MMORPG compartilhada com outros humanos.'
    ]
  };
};

const turnText = (turn: MatchTurnView): string[] => [
  `🎯 Lance ${turn.sequence}: ${turn.contextText}`,
  turn.previousOutcome ? `Último desfecho: ${turn.previousOutcome}` : 'Último desfecho: abertura de nova jogada.',
  `Prazo do turno: ${turn.deadlineAt.toISOString()}`
];

export const buildMatchCardViewModel = (match: MatchSummary): MatchCardViewModel => ({
  headline: '🎮 TELESOCCER MATCH CENTER',
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
