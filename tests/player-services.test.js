import test from "node:test";
import assert from "node:assert/strict";
import { PlayerService } from "../src/domain/player/services.js";
import { InMemoryPlayerRepository } from "../src/infra/memory/player-repository.js";

test("PlayerService cria jogador", async () => {
  const service = new PlayerService(new InMemoryPlayerRepository());
  const player = await service.createPlayer({
    telegramUserId: "10",
    name: "Ronaldo",
    position: "ATA",
    country: "Brasil"
  });

  assert.equal(player.age, 14);
  assert.equal(player.name, "Ronaldo");
});

test("PlayerService impede duplicidade", async () => {
  const service = new PlayerService(new InMemoryPlayerRepository());
  await service.createPlayer({
    telegramUserId: "10",
    name: "Ronaldo",
    position: "ATA",
    country: "Brasil"
  });

  await assert.rejects(
    () =>
      service.createPlayer({
        telegramUserId: "10",
        name: "Rivaldo",
        position: "MEI",
        country: "Brasil"
      }),
    /Usuário já possui jogador criado/
  );
});
