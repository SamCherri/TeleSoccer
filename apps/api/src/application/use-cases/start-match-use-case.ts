import type { Match } from '../../domain/entities/match.js';
import type { MatchRepository } from '../../domain/repositories/match-repository.js';

export class StartMatchUseCase {
  constructor(private readonly repository: MatchRepository) {}

  async execute(): Promise<Match> {
    return this.repository.createInitial();
  }
}
