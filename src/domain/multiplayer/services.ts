import { DomainError } from '../../shared/errors';
import { CareerStatus } from '../shared/enums';
import { CreateMultiplayerLobbyInput, MultiplayerLobbyRepository, MultiplayerPlayerProfile } from './repository';
import { MultiplayerLobbyStatus, MultiplayerLobbyStatusView, MultiplayerLobbyView } from './types';

const LOBBY_CODE_LENGTH = 6;
const LOBBY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_LOBBY_PARTICIPANTS = 2;

const buildLobbyStatusView = (lobby: MultiplayerLobbyView): MultiplayerLobbyStatusView => ({
  ...lobby,
  canStartMatchPreparation: lobby.status === MultiplayerLobbyStatus.Ready && lobby.participants.length === MAX_LOBBY_PARTICIPANTS,
  openSlotCount: Math.max(0, MAX_LOBBY_PARTICIPANTS - lobby.participants.length)
});

export class CreateLobbyService {
  constructor(
    private readonly multiplayerRepository: MultiplayerLobbyRepository,
    private readonly codeGenerator: () => string = () => CreateLobbyService.generateLobbyCode()
  ) {}

  async execute(telegramId: string): Promise<MultiplayerLobbyStatusView> {
    const player = await this.requireProfessionalPlayer(telegramId);
    await this.ensureUserIsNotAlreadyInLobby(player.telegramId);

    const lobby = await this.multiplayerRepository.createLobby({
      ...(await this.buildUniqueLobbyInput(player)),
      hostUserId: player.userId,
      hostPlayerId: player.playerId,
      hostPlayerName: player.playerName,
      hostTelegramId: player.telegramId
    });

    return buildLobbyStatusView(lobby);
  }

  static generateLobbyCode(): string {
    let code = '';
    for (let index = 0; index < LOBBY_CODE_LENGTH; index += 1) {
      const charIndex = Math.floor(Math.random() * LOBBY_CODE_ALPHABET.length);
      code += LOBBY_CODE_ALPHABET[charIndex];
    }
    return code;
  }

  private async buildUniqueLobbyInput(player: MultiplayerPlayerProfile): Promise<CreateMultiplayerLobbyInput> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const lobbyCode = this.codeGenerator().toUpperCase();
      const existing = await this.multiplayerRepository.findLobbyByCode(lobbyCode);
      if (!existing) {
        return {
          lobbyCode,
          hostUserId: player.userId,
          hostPlayerId: player.playerId,
          hostPlayerName: player.playerName,
          hostTelegramId: player.telegramId
        };
      }
    }

    throw new DomainError('Não foi possível gerar um código de sala único para o multiplayer MVP.');
  }

  private async requireProfessionalPlayer(telegramId: string): Promise<MultiplayerPlayerProfile> {
    const player = await this.multiplayerRepository.findPlayerByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador e entre no profissional antes de abrir uma sala multiplayer.');
    }
    if (player.careerStatus !== CareerStatus.Professional) {
      throw new DomainError('Somente jogadores profissionais podem abrir salas do multiplayer MVP.');
    }
    return player;
  }

  private async ensureUserIsNotAlreadyInLobby(telegramId: string): Promise<void> {
    const existingLobby = await this.multiplayerRepository.findActiveLobbyByTelegramId(telegramId);
    if (existingLobby) {
      throw new DomainError(`Você já está vinculado à sala ${existingLobby.lobbyCode}. Consulte /sala antes de criar outra.`);
    }
  }
}

export class JoinLobbyService {
  constructor(private readonly multiplayerRepository: MultiplayerLobbyRepository) {}

  async execute(telegramId: string, rawLobbyCode: string): Promise<MultiplayerLobbyStatusView> {
    const lobbyCode = rawLobbyCode.trim().toUpperCase();
    if (!lobbyCode) {
      throw new DomainError('Informe um código de sala válido no formato /entrar-sala CODIGO.');
    }

    const player = await this.requireProfessionalPlayer(telegramId);
    await this.ensureUserIsNotAlreadyInLobby(player.telegramId);

    const lobby = await this.multiplayerRepository.findLobbyByCode(lobbyCode);
    if (!lobby || lobby.status === MultiplayerLobbyStatus.Closed) {
      throw new DomainError('Sala multiplayer não encontrada para o código informado.');
    }
    if (lobby.participants.some((participant) => participant.userId === player.userId)) {
      throw new DomainError('Este usuário já faz parte desta sala multiplayer.');
    }
    if (lobby.hostPlayerId === player.playerId) {
      throw new DomainError('O anfitrião não pode entrar novamente na própria sala.');
    }
    if (lobby.participants.length >= MAX_LOBBY_PARTICIPANTS) {
      throw new DomainError('Esta sala já está cheia e pronta para preparar a partida multiplayer.');
    }

    const joinedLobby = await this.multiplayerRepository.joinLobby({
      lobbyId: lobby.id,
      userId: player.userId,
      playerId: player.playerId,
      playerName: player.playerName,
      telegramId: player.telegramId
    });

    const updatedLobby = await this.multiplayerRepository.updateLobbyStatus(joinedLobby.id, MultiplayerLobbyStatus.Ready, new Date());
    return buildLobbyStatusView(updatedLobby);
  }

  private async requireProfessionalPlayer(telegramId: string): Promise<MultiplayerPlayerProfile> {
    const player = await this.multiplayerRepository.findPlayerByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador e entre no profissional antes de participar do multiplayer MVP.');
    }
    if (player.careerStatus !== CareerStatus.Professional) {
      throw new DomainError('Somente jogadores profissionais podem entrar em salas do multiplayer MVP.');
    }
    return player;
  }

  private async ensureUserIsNotAlreadyInLobby(telegramId: string): Promise<void> {
    const existingLobby = await this.multiplayerRepository.findActiveLobbyByTelegramId(telegramId);
    if (existingLobby) {
      throw new DomainError(`Você já está vinculado à sala ${existingLobby.lobbyCode}. Consulte /sala antes de entrar em outra.`);
    }
  }
}

export class GetLobbyStatusService {
  constructor(private readonly multiplayerRepository: MultiplayerLobbyRepository) {}

  async execute(telegramId: string): Promise<MultiplayerLobbyStatusView> {
    const lobby = await this.multiplayerRepository.findActiveLobbyByTelegramId(telegramId);
    if (!lobby) {
      throw new DomainError('Nenhuma sala multiplayer ativa foi encontrada para este usuário.');
    }

    const status = await this.multiplayerRepository.getLobbyStatus(lobby.id);
    if (!status) {
      throw new DomainError('Não foi possível consultar o estado atual da sala multiplayer.');
    }

    return status;
  }
}
