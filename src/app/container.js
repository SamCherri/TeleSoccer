import { Phase1Dispatcher } from "../bot/phase1-dispatcher.js";
import { readEnv } from "../config/env.js";
import { AuthService } from "../domain/auth/services.js";
import { PlayerService } from "../domain/player/services.js";
import { InMemoryPlayerRepository } from "../infra/memory/player-repository.js";
import { InMemorySessionRepository } from "../infra/memory/session-repository.js";

export function createContainer() {
  const env = readEnv();
  const playerRepository = new InMemoryPlayerRepository();
  const sessionRepository = new InMemorySessionRepository();
  const playerService = new PlayerService(playerRepository);
  const authService = new AuthService({ playerRepository, sessionRepository });
  const phase1Dispatcher = new Phase1Dispatcher({ playerService, authService });

  return {
    env,
    playerService,
    authService,
    phase1Dispatcher
  };
}
