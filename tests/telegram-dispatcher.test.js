import test from "node:test";
import assert from "node:assert/strict";
import { Phase1Dispatcher } from "../src/bot/phase1-dispatcher.js";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";
import { AuthService } from "../src/domain/auth/services.js";
import { InMemorySessionRepository } from "../src/infra/memory/session-repository.js";

function createDispatcher() {
  const playerRepository = new InMemoryPlayerRepository();
  const playerService = new PlayerService(playerRepository);
  const authService = new AuthService({
    playerRepository,
    sessionRepository: new InMemorySessionRepository()
  });

  return new Phase1Dispatcher({ playerService, authService });
}

test("Dispatcher responde /start", async () => {
  const dispatcher = createDispatcher();
  const result = await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/start" } });
  assert.match(result, /Bem-vindo ao TeleSoccer/);
  assert.match(result, /\/login/);
});

test("Dispatcher cria jogador por comando", async () => {
  const dispatcher = createDispatcher();
  const result = await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/criar_jogador Marta MEI Brasil" } });
  assert.match(result, /Jogador criado/);
});

test("Dispatcher realiza login por comando", async () => {
  const dispatcher = createDispatcher();
  await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/criar_jogador Marta MEI Brasil" } });

  const result = await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/login" } });
  assert.match(result, /Login realizado com sucesso/);
});
