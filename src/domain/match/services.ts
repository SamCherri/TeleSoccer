import { CareerStatus } from '../shared/enums';
import { DomainError } from '../../shared/errors';
import { MatchEngine } from './engine';
import { MatchRepository } from './repository';
import { MatchActionKey, MatchRole, MatchStatus, ResolveTurnResult, StartMatchResult } from './types';

const cpuClubPool = [
  { id: 'cpu-club-1', name: 'Atlético da Serra' },
  { id: 'cpu-club-2', name: 'Real Aurora' },
  { id: 'cpu-club-3', name: 'Ferroviário do Norte' }
];

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
    const initialTurn = this.matchEngine.createInitialTurn(player, now);
    const match = await this.matchRepository.createMatchForPlayer({
      telegramId,
      homeClubId: player.clubId ?? 'unknown-home-club',
      homeClubName: player.clubName ?? 'Clube profissional',
      awayClubId: opponent.id,
      awayClubName: opponent.name,
      playerId: player.playerId,
      userRole: player.position === 'GOALKEEPER' ? MatchRole.Goalkeeper : MatchRole.UserPlayer,
      initialTurn
    });

    return { match };
  }
}

export class GetActiveMatchService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(telegramId: string) {
    const activeMatch = await this.matchRepository.getActiveMatchByTelegramId(telegramId);
    if (activeMatch) {
      return activeMatch;
    }

    const latestMatch = await this.matchRepository.getLatestMatchByTelegramId(telegramId);
    if (latestMatch) {
      return latestMatch;
    }

    throw new DomainError('Nenhuma partida ativa ou finalizada encontrada para este jogador.');
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

    if (action && !activeMatch.activeTurn.availableActions.some((candidate) => candidate.key === action)) {
      throw new DomainError('Ação inválida para o contexto atual do lance.');
    }

    const resolution = this.matchEngine.resolve({
      matchId: activeMatch.id,
      player,
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
        currentYellowCards: activeMatch.yellowCards
      },
      action,
      now
    });

    return this.matchRepository.resolveTurn(activeMatch.id, resolution);
  }
}
