export class AuthService {
  constructor({ playerRepository, sessionRepository }) {
    this.playerRepository = playerRepository;
    this.sessionRepository = sessionRepository;
  }

  async loginWithTelegramUserId(telegramUserId) {
    if (!telegramUserId?.trim()) throw new Error("telegramUserId é obrigatório");

    const player = await this.playerRepository.findByTelegramUserId(telegramUserId);
    if (!player) {
      throw new Error("Jogador não encontrado. Use /criar_jogador antes de fazer login.");
    }

    const session = await this.sessionRepository.createOrRefresh({
      telegramUserId,
      playerId: player.id
    });

    return {
      session,
      player
    };
  }

  async logoutWithTelegramUserId(telegramUserId) {
    if (!telegramUserId?.trim()) throw new Error("telegramUserId é obrigatório");
    const removed = await this.sessionRepository.deleteByTelegramUserId(telegramUserId);
    if (!removed) throw new Error("Usuário não estava logado");
    return { success: true };
  }

  async getSessionByTelegramUserId(telegramUserId) {
    if (!telegramUserId?.trim()) throw new Error("telegramUserId é obrigatório");
    return this.sessionRepository.findByTelegramUserId(telegramUserId);
  }
}
