import test from "node:test";
import assert from "node:assert/strict";
import { createRailwayTelegramServer } from "../src/infra/http/railway-telegram-server.js";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";
import { Phase1Dispatcher } from "../src/bot/phase1-dispatcher.js";
import { AuthService } from "../src/domain/auth/services.js";
import { InMemorySessionRepository } from "../src/infra/memory/session-repository.js";

test("Servidor responde health e fluxo de login", async () => {
  const playerRepository = new InMemoryPlayerRepository();
  const playerService = new PlayerService(playerRepository);
  const authService = new AuthService({
    playerRepository,
    sessionRepository: new InMemorySessionRepository()
  });
  const phase1Dispatcher = new Phase1Dispatcher({ playerService, authService });
  const server = createRailwayTelegramServer({ playerService, authService, phase1Dispatcher });

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

  const loginRes = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ telegramUserId: "22" })
  });

  assert.equal(loginRes.status, 200);
  const loginPayload = await loginRes.json();
  assert.equal(loginPayload.player.name, "Kaka");

  server.close();
});
