import type { Match } from '../entities/match.js';

export interface MatchRepository {
  createInitial(): Promise<Match>;
  getById(matchId: string): Promise<Match | null>;
}
