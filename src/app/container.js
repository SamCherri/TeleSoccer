import { Phase1Dispatcher } from "../bot/phase1-dispatcher.js";
import { readEnv } from "../config/env.js";
import { PlayerService } from "../domain/player/services.js";
import { InMemoryPlayerRepository } from "../infra/memory/player-repository.js";

export function createContainer() {
  const env = readEnv();
  const playerRepository = new InMemoryPlayerRepository();
  const playerService = new PlayerService(playerRepository);
  const phase1Dispatcher = new Phase1Dispatcher(playerService);

  return {
    env,
    playerService,
    phase1Dispatcher
  };
}
