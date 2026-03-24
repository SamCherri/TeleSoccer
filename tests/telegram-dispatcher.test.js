import test from "node:test";
import assert from "node:assert/strict";
import { Phase1Dispatcher } from "../src/bot/phase1-dispatcher.js";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";

test("Dispatcher responde /start", async () => {
  const dispatcher = new Phase1Dispatcher(new PlayerService(new InMemoryPlayerRepository()));
  const result = await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/start" } });
  assert.match(result, /Bem-vindo ao TeleSoccer/);
});

test("Dispatcher cria jogador por comando", async () => {
  const dispatcher = new Phase1Dispatcher(new PlayerService(new InMemoryPlayerRepository()));
  const result = await dispatcher.dispatch({ message: { from: { id: 1 }, text: "/criar_jogador Marta MEI Brasil" } });
  assert.match(result, /Jogador criado/);
});
