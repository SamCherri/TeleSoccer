export class InMemorySessionRepository {
  constructor() {
    this.sessions = new Map();
  }

  async createOrRefresh({ telegramUserId, playerId }) {
    const now = new Date();
    const existing = this.sessions.get(telegramUserId);

    if (existing) {
      const refreshed = {
        ...existing,
        lastSeenAt: now,
        updatedAt: now
      };
      this.sessions.set(telegramUserId, refreshed);
      return refreshed;
    }

    const created = {
      telegramUserId,
      playerId,
      loggedInAt: now,
      lastSeenAt: now,
      updatedAt: now
    };
    this.sessions.set(telegramUserId, created);
    return created;
  }

  async findByTelegramUserId(telegramUserId) {
    return this.sessions.get(telegramUserId) ?? null;
  }

  async deleteByTelegramUserId(telegramUserId) {
    return this.sessions.delete(telegramUserId);
  }
}
