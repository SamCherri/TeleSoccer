import type { Match } from '../../domain/entities/match.js';
import type { MatchRepository } from '../../domain/repositories/match-repository.js';

export class InMemoryMatchRepository implements MatchRepository {
  private readonly store = new Map<string, Match>();

  async createInitial(): Promise<Match> {
    const match: Match = {
      id: crypto.randomUUID(),
      status: 'NOT_STARTED',
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      sceneText: 'Pré-jogo: times se posicionando no gramado.',
      possession: 'HOME'
    };

    this.store.set(match.id, match);
    return match;
  }

  async getById(matchId: string): Promise<Match | null> {
    return this.store.get(matchId) ?? null;
  }
}
