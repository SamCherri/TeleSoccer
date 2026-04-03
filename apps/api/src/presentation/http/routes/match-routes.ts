import type { FastifyInstance } from 'fastify';
import { StartMatchUseCase } from '../../../application/use-cases/start-match-use-case.js';
import { InMemoryMatchRepository } from '../../../infra/repositories/in-memory-match-repository.js';
import type { MatchStateView } from '../../../shared/contracts/match-contracts.js';

export async function registerMatchRoutes(app: FastifyInstance): Promise<void> {
  const repository = new InMemoryMatchRepository();
  const startMatch = new StartMatchUseCase(repository);

  app.post('/matches/start', async () => {
    const match = await startMatch.execute();

    const view: MatchStateView = {
      matchId: match.id,
      status: match.status,
      minute: match.minute,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      possession: match.possession,
      sceneText: match.sceneText
    };

    return { match: view };
  });
}
