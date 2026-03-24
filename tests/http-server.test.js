import test from "node:test";
import assert from "node:assert/strict";
import { createRailwayTelegramServer } from "../src/infra/http/railway-telegram-server.js";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";
import { Phase1Dispatcher } from "../src/bot/phase1-dispatcher.js";

test("Servidor responde health e cria jogador", async () => {
  const playerService = new PlayerService(new InMemoryPlayerRepository());
  const phase1Dispatcher = new Phase1Dispatcher(playerService);
  const server = createRailwayTelegramServer({ playerService, phase1Dispatcher });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);

  const createRes = await fetch(`http://127.0.0.1:${port}/players`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      telegramUserId: "22",
      name: "Kaka",
      position: "MEI",
      country: "Brasil"
    })
  });
  assert.equal(createRes.status, 201);

  server.close();
});
