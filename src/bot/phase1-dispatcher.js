export class Phase1Dispatcher {
  constructor({ playerService, authService }) {
    this.playerService = playerService;
    this.authService = authService;
  }

  async dispatch(update) {
    const text = update?.message?.text?.trim();
    const fromId = update?.message?.from?.id;
    const telegramUserId = String(fromId ?? "");

    if (!text || !fromId) return "Atualização inválida.";

    if (text === "/start") {
      return [
        "Bem-vindo ao TeleSoccer!",
        "Comandos:",
        "/start",
        "/login",
        "/logout",
        "/criar_jogador <nome> <posicao> <pais>",
        "Posições válidas: GOL, ZAG, LAT, VOL, MEI, ATA"
      ].join("\n");
    }

    if (text === "/login") {
      try {
        const { player } = await this.authService.loginWithTelegramUserId(telegramUserId);
        return `Login realizado com sucesso. Bem-vindo de volta, ${player.name}!`;
      } catch (error) {
        return error instanceof Error ? error.message : "Erro ao fazer login";
      }
    }

    if (text === "/logout") {
      try {
        await this.authService.logoutWithTelegramUserId(telegramUserId);
        return "Logout realizado com sucesso.";
      } catch (error) {
        return error instanceof Error ? error.message : "Erro ao fazer logout";
      }
    }

    if (text.startsWith("/criar_jogador")) {
      const [, name, position, ...countryParts] = text.split(" ");
      const country = countryParts.join(" ").trim();
      if (!name || !position || !country) return "Uso: /criar_jogador <nome> <posicao> <pais>";

      try {
        const player = await this.playerService.createPlayer({
          telegramUserId,
          name,
          position: position.toUpperCase(),
          country
        });
        return `Jogador criado: ${player.name} (${player.position}) - ${player.country}. Agora faça login com /login`;
      } catch (error) {
        return error instanceof Error ? error.message : "Erro ao criar jogador";
      }
    }

    return "Comando não reconhecido. Use /start para ajuda.";
  }
}
