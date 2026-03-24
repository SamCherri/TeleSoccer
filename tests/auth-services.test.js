import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/domain/auth/services.js";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";
import { InMemorySessionRepository } from "../src/infra/memory/session-repository.js";

test("AuthService realiza login quando jogador existe", async () => {
  const playerRepository = new InMemoryPlayerRepository();
  const playerService = new PlayerService(playerRepository);
  const authService = new AuthService({
    playerRepository,
    sessionRepository: new InMemorySessionRepository()
  });

  await playerService.createPlayer({
    telegramUserId: "10",
    name: "Ronaldo",
    position: "ATA",
    country: "Brasil"
  });

  const { player, session } = await authService.loginWithTelegramUserId("10");
  assert.equal(player.name, "Ronaldo");
  assert.equal(session.telegramUserId, "10");
});

test("AuthService falha login sem jogador", async () => {
  const authService = new AuthService({
    playerRepository: new InMemoryPlayerRepository(),
    sessionRepository: new InMemorySessionRepository()
  });

  await assert.rejects(() => authService.loginWithTelegramUserId("404"), /Jogador não encontrado/);
});

test("AuthService faz logout de sessão existente", async () => {
  const playerRepository = new InMemoryPlayerRepository();
  const playerService = new PlayerService(playerRepository);
  const authService = new AuthService({
    playerRepository,
    sessionRepository: new InMemorySessionRepository()
  });

  await playerService.createPlayer({
    telegramUserId: "10",
    name: "Ronaldo",
    position: "ATA",
    country: "Brasil"
  });
  await authService.loginWithTelegramUserId("10");

  const out = await authService.logoutWithTelegramUserId("10");
  assert.equal(out.success, true);
});
