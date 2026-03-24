export class Phase1Dispatcher {
  constructor(playerService) {
    this.playerService = playerService;
  }

  async dispatch(update) {
    const text = update?.message?.text?.trim();
    const fromId = update?.message?.from?.id;

    if (!text || !fromId) return "Atualização inválida.";

    if (text === "/start") {
      return [
        "Bem-vindo ao TeleSoccer!",
        "Comandos:",
        "/start",
        "/criar_jogador <nome> <posicao> <pais>",
        "Posições válidas: GOL, ZAG, LAT, VOL, MEI, ATA"
      ].join("\n");
    }

    if (text.startsWith("/criar_jogador")) {
      const [, name, position, ...countryParts] = text.split(" ");
      const country = countryParts.join(" ").trim();
      if (!name || !position || !country) return "Uso: /criar_jogador <nome> <posicao> <pais>";

      try {
        const player = await this.playerService.createPlayer({
          telegramUserId: String(fromId),
          name,
          position: position.toUpperCase(),
          country
        });
        return `Jogador criado: ${player.name} (${player.position}) - ${player.country}`;
      } catch (error) {
        return error instanceof Error ? error.message : "Erro ao criar jogador";
      }
    }

    return "Comando não reconhecido. Use /start para ajuda.";
  }
}
