import { randomUUID } from "node:crypto";

export class InMemoryPlayerRepository {
  constructor() {
    this.players = new Map();
  }

  async create(input) {
    const now = new Date();
    const player = {
      id: randomUUID(),
      telegramUserId: input.telegramUserId,
      name: input.name,
      position: input.position,
      country: input.country,
      age: 14,
      createdAt: now,
      updatedAt: now
    };
    this.players.set(player.telegramUserId, player);
    return player;
  }

  async findByTelegramUserId(telegramUserId) {
    return this.players.get(telegramUserId) ?? null;
  }

  async list() {
    return [...this.players.values()];
  }
}
