import { VALID_POSITIONS } from "./types.js";

export class PlayerService {
  constructor(playerRepository) {
    this.playerRepository = playerRepository;
  }

  async createPlayer(input) {
    if (!input?.telegramUserId?.trim()) throw new Error("telegramUserId é obrigatório");
    if (!input?.name?.trim()) throw new Error("name é obrigatório");
    if (!VALID_POSITIONS.has(input?.position)) throw new Error("position inválida");
    if (!input?.country?.trim()) throw new Error("country é obrigatório");

    const existing = await this.playerRepository.findByTelegramUserId(input.telegramUserId);
    if (existing) throw new Error("Usuário já possui jogador criado");

    return this.playerRepository.create(input);
  }

  async listPlayers() {
    return this.playerRepository.list();
  }
}
