import { CareerStatus } from '../shared/enums';
import { DomainError } from '../../shared/errors';
import { MatchEngine } from './engine';
import { buildDefaultMatchLineups } from './lineup-factory';
import { MatchPlayerProfile, MatchRepository } from './repository';
import { MatchActionKey, MatchRole, MatchStatus, MatchSummary, ResolveTurnResult, StartMatchResult } from './types';

const cpuClubPool = [
  { id: 'cpu-club-1', name: 'Atlético da Serra' },
  { id: 'cpu-club-2', name: 'Real Aurora' },
  { id: 'cpu-club-3', name: 'Ferroviário do Norte' }
];

const hasExpiredPendingTurn = (match: MatchSummary, now: Date): boolean =>
  Boolean(match.activeTurn && match.activeTurn.deadlineAt.getTime() <= now.getTime());

export class StartMatchService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchEngine: MatchEngine
  ) {}

  async execute(telegramId: string, now = new Date()): Promise<StartMatchResult> {
    const player = await this.matchRepository.findPlayerByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie e desenvolva seu jogador antes de iniciar uma partida.');
    }
    if (player.careerStatus !== CareerStatus.Professional) {
      throw new DomainError('Somente jogadores profissionais podem entrar em partidas da Fase 2.');
    }

    const active = await this.matchRepository.getActiveMatchByTelegramId(telegramId);
    if (active?.status === MatchStatus.InProgress) {
      return { match: active };
    }

    const suspended = await this.matchRepository.consumePendingSuspension(player.playerId);
    if (suspended) {
      throw new DomainError('Você está suspenso para esta partida por cartão vermelho ou acúmulo disciplinar.');
    }

    const opponent = cpuClubPool[Math.abs(player.playerId.length) % cpuClubPool.length];
    const lineups = buildDefaultMatchLineups(player);
    const initialTurn = this.matchEngine.createInitialTurn(player, lineups, now);
    const match = await this.matchRepository.createMatchForPlayer({
      telegramId,
      homeClubId: player.clubId ?? 'unknown-home-club',
      homeClubName: player.clubName ?? 'Clube profissional',
      awayClubName: opponent.name,
      playerId: player.playerId,
      userRole: player.position === 'GOALKEEPER' ? MatchRole.Goalkeeper : MatchRole.UserPlayer,
      lineups,
      initialTurn
    });

    return { match };
  }
}

export class GetActiveMatchService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchEngine: MatchEngine
  ) {}

  async execute(telegramId: string, now = new Date()) {
    const optional = await this.executeOptional(telegramId, now);
    if (optional) {
      return optional;
    }

    throw new DomainError('Nenhuma partida ativa ou finalizada encontrada para este jogador.');
  }

  async executeOptional(telegramId: string, now = new Date()) {
    const activeMatch = await this.matchRepository.getActiveMatchByTelegramId(telegramId);
    if (activeMatch) {
      return this.resolveExpiredTurnIfNeeded(telegramId, activeMatch, now);
    }

    const latestMatch = await this.matchRepository.getLatestMatchByTelegramId(telegramId);
    if (latestMatch) {
      return latestMatch;
    }

    return null;
  }

  private async resolveExpiredTurnIfNeeded(telegramId: string, match: MatchSummary, now: Date): Promise<MatchSummary> {
    if (!hasExpiredPendingTurn(match, now)) {
      return match;
    }

    const player = await this.requirePlayer(telegramId);
    const resolution = this.matchEngine.resolve({
      matchId: match.id,
      player,
      lineups: match.lineups,
      turn: {
        id: match.activeTurn!.id,
        sequence: match.activeTurn!.sequence,
        minute: match.activeTurn!.minute,
        half: match.activeTurn!.half,
        possessionSide: match.activeTurn!.possessionSide,
        contextType: match.activeTurn!.contextType,
        deadlineAt: match.activeTurn!.deadlineAt,
        homeScore: match.scoreboard.homeScore,
        awayScore: match.scoreboard.awayScore,
        energy: match.energy,
        stoppageMinutes: match.scoreboard.stoppageMinutes,
        currentYellowCards: match.yellowCards,
        visualEvent: match.activeTurn!.visualEvent
      },
      now
    });

    return (await this.matchRepository.resolveTurn(match.id, resolution)).match;
  }

  private async requirePlayer(telegramId: string): Promise<MatchPlayerProfile> {
    const player = await this.matchRepository.findPlayerByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Jogador não encontrado para consultar a partida.');
    }
    return player;
  }
}

export class ResolveMatchTurnService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchEngine: MatchEngine
  ) {}

  async execute(telegramId: string, action?: MatchActionKey, now = new Date()): Promise<ResolveTurnResult> {
    const player = await this.matchRepository.findPlayerByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Jogador não encontrado para resolver o lance.');
    }

    const activeMatch = await this.matchRepository.getActiveMatchByTelegramId(telegramId);
    if (!activeMatch?.activeTurn) {
      throw new DomainError('Não existe lance pendente para esta partida.');
    }

    const expired = hasExpiredPendingTurn(activeMatch, now);
    if (!expired && action && !activeMatch.activeTurn.availableActions.some((candidate) => candidate.key === action)) {
      throw new DomainError('Ação inválida para o contexto atual do lance.');
    }

    const resolution = this.matchEngine.resolve({
      matchId: activeMatch.id,
      player,
      lineups: activeMatch.lineups,
      turn: {
        id: activeMatch.activeTurn.id,
        sequence: activeMatch.activeTurn.sequence,
        minute: activeMatch.activeTurn.minute,
        half: activeMatch.activeTurn.half,
        possessionSide: activeMatch.activeTurn.possessionSide,
        contextType: activeMatch.activeTurn.contextType,
        deadlineAt: activeMatch.activeTurn.deadlineAt,
        homeScore: activeMatch.scoreboard.homeScore,
        awayScore: activeMatch.scoreboard.awayScore,
        energy: activeMatch.energy,
        stoppageMinutes: activeMatch.scoreboard.stoppageMinutes,
        currentYellowCards: activeMatch.yellowCards,
        visualEvent: activeMatch.activeTurn.visualEvent
      },
      action: expired ? undefined : action,
      now
    });

    return this.matchRepository.resolveTurn(activeMatch.id, resolution);
  }
}
