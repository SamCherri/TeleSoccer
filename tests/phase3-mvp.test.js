const test = require('node:test');
const assert = require('node:assert/strict');

const { CareerStatus, DominantFoot, PlayerPosition } = require('../dist/domain/shared/enums.js');
const { CreatePlayerService, TryoutService, GetPlayerCardService, GetCareerStatusService, GetCareerHistoryService, GetWalletStatementService, WeeklyTrainingService } = require('../dist/domain/player/services.js');
const { CreateLobbyService, GetLobbyStatusService, JoinLobbyService } = require('../dist/domain/multiplayer/services.js');
const { MultiplayerLobbyStatus } = require('../dist/domain/multiplayer/types.js');
const { Phase1TelegramFacade, phase1BotActions } = require('../dist/bot/phase1-bot.js');
const { Phase1TelegramDispatcher } = require('../dist/bot/phase1-dispatcher.js');
const { Phase1PlayerCreationFlow } = require('../dist/bot/player-creation-flow.js');
const { InMemoryPlayerCreationConversationStore } = require('../dist/bot/conversation-store.js');
const { DomainError } = require('../dist/shared/errors.js');

class InMemoryPlayerRepository {
  constructor() {
    this.playersByTelegramId = new Map();
    this.historyByPlayerId = new Map();
    this.tryoutsByPlayerId = new Map();
    this.walletTransactionsByPlayerId = new Map();
  }

  async createPlayer(input) {
    const player = {
      id: `player-${input.telegramId}`,
      userId: `user-${input.telegramId}`,
      generationId: `generation-${input.telegramId}`,
      name: input.name,
      nationality: input.nationality,
      position: input.position,
      dominantFoot: input.dominantFoot,
      age: 14,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      visual: input.visual,
      careerStatus: CareerStatus.Youth,
      walletBalance: input.startingWalletBalance,
      currentClubId: undefined,
      currentClubName: undefined,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      attributes: { ...input.attributes },
      trainingHistoryCount: 0,
      tryoutHistoryCount: 0
    };

    this.playersByTelegramId.set(input.telegramId, player);
    this.historyByPlayerId.set(player.id, []);
    this.tryoutsByPlayerId.set(player.id, []);
    this.walletTransactionsByPlayerId.set(player.id, []);
    return player;
  }

  async findByTelegramId(telegramId) {
    return this.playersByTelegramId.get(telegramId) ?? null;
  }

  async getCareerStatusByTelegramId(telegramId, currentWeekNumber) {
    const player = await this.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      age: player.age,
      currentClubName: player.currentClubName,
      walletBalance: player.walletBalance,
      totalTrainings: player.trainingHistoryCount,
      totalTryouts: player.tryoutHistoryCount,
      lastTrainingWeek: undefined,
      trainingAvailableThisWeek: true,
      currentWeekNumber,
      latestTryout: this.tryoutsByPlayerId.get(player.id).at(-1),
      recentHistory: []
    };
  }

  async getCareerHistoryByTelegramId(telegramId) {
    const player = await this.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      currentClubName: player.currentClubName,
      totalEntries: this.historyByPlayerId.get(player.id).length,
      entries: []
    };
  }

  async getWalletStatementByTelegramId(telegramId) {
    const player = await this.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      walletBalance: player.walletBalance,
      transactionCount: 0,
      recentTransactions: []
    };
  }

  async applyTraining() {
    throw new Error('not used');
  }

  async registerTryout(params) {
    const player = [...this.playersByTelegramId.values()].find((entry) => entry.id === params.playerId);
    const status = params.approvedClubId ? 'APPROVED' : 'FAILED';
    player.walletBalance -= params.cost;
    player.tryoutHistoryCount += 1;

    if (params.approvedClubId) {
      player.careerStatus = CareerStatus.Professional;
      player.currentClubId = params.approvedClubId;
      player.currentClubName = params.approvedClubName;
    }

    this.tryoutsByPlayerId.get(player.id).push({
      status,
      score: params.score,
      requiredScore: params.requiredScore,
      clubName: params.approvedClubName,
      createdAt: new Date('2026-03-02T00:00:00.000Z')
    });

    return {
      playerId: player.id,
      status,
      score: params.score,
      requiredScore: params.requiredScore,
      cost: params.cost,
      walletBalance: player.walletBalance,
      clubName: params.approvedClubName
    };
  }
}

class InMemoryClubRepository {
  async ensureStarterClubs() {}
  async findStarterClubForTryout() {
    return { id: 'club-1', name: 'Porto Azul FC', country: 'Brasil', city: 'Porto Azul', division: 'Regional A', reputation: 60 };
  }
}

class InMemoryMultiplayerLobbyRepository {
  constructor(playerRepository) {
    this.playerRepository = playerRepository;
    this.lobbies = new Map();
  }

  async findPlayerByTelegramId(telegramId) {
    const player = await this.playerRepository.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    return {
      userId: player.userId,
      playerId: player.id,
      telegramId,
      playerName: player.name,
      careerStatus: player.careerStatus,
      currentClubName: player.currentClubName
    };
  }

  async findLobbyByCode(lobbyCode) {
    return [...this.lobbies.values()].find((lobby) => lobby.lobbyCode === lobbyCode) ?? null;
  }

  async findActiveLobbyByTelegramId(telegramId) {
    return [...this.lobbies.values()].find((lobby) =>
      lobby.status !== MultiplayerLobbyStatus.Closed && lobby.participants.some((participant) => participant.telegramId === telegramId)
    ) ?? null;
  }

  async createLobby(input) {
    const lobby = {
      id: `lobby-${input.lobbyCode}`,
      lobbyCode: input.lobbyCode,
      status: MultiplayerLobbyStatus.Open,
      createdAt: new Date('2026-03-03T12:00:00.000Z'),
      readyForMatchAt: undefined,
      linkedMatchId: undefined,
      hostPlayerId: input.hostPlayerId,
      hostPlayerName: input.hostPlayerName,
      participants: [
        {
          userId: input.hostUserId,
          playerId: input.hostPlayerId,
          playerName: input.hostPlayerName,
          telegramId: input.hostTelegramId,
          isHost: true,
          slotNumber: 1,
          joinedAt: new Date('2026-03-03T12:00:00.000Z')
        }
      ]
    };

    this.lobbies.set(lobby.id, lobby);
    return lobby;
  }

  async joinLobby(input) {
    const lobby = this.lobbies.get(input.lobbyId);
    lobby.participants.push({
      userId: input.userId,
      playerId: input.playerId,
      playerName: input.playerName,
      telegramId: input.telegramId,
      isHost: false,
      slotNumber: 2,
      joinedAt: new Date('2026-03-03T12:05:00.000Z')
    });
    return lobby;
  }

  async updateLobbyStatus(lobbyId, status, readyForMatchAt) {
    const lobby = this.lobbies.get(lobbyId);
    lobby.status = status;
    lobby.readyForMatchAt = readyForMatchAt;
    return lobby;
  }

  async getLobbyStatus(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return null;
    }

    return {
      ...lobby,
      canStartMatchPreparation: lobby.status === MultiplayerLobbyStatus.Ready && lobby.participants.length === 2,
      openSlotCount: Math.max(0, 2 - lobby.participants.length)
    };
  }
}

class DisabledService {
  async execute() {
    throw new DomainError('not used');
  }
}

async function createProfessionalPlayer(playerRepository, telegramId, name) {
  const createPlayerService = new CreatePlayerService(playerRepository);
  await createPlayerService.execute({
    telegramId,
    name,
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 178,
    weightKg: 72,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const tryoutService = new TryoutService(playerRepository, new InMemoryClubRepository());
  await tryoutService.execute(telegramId, new Date('2026-03-02T00:00:00.000Z'));
}

test('cria sala multiplayer persistida para jogador profissional', async () => {
  const playerRepository = new InMemoryPlayerRepository();
  await createProfessionalPlayer(playerRepository, '501', 'Caio Multiplayer');
  const lobbyRepository = new InMemoryMultiplayerLobbyRepository(playerRepository);
  const service = new CreateLobbyService(lobbyRepository, () => 'ABC123');

  const lobby = await service.execute('501');

  assert.equal(lobby.lobbyCode, 'ABC123');
  assert.equal(lobby.status, MultiplayerLobbyStatus.Open);
  assert.equal(lobby.participants.length, 1);
  assert.equal(lobby.participants[0].isHost, true);
  assert.equal(lobby.openSlotCount, 1);
});

test('permite que o segundo usuário entre na mesma sessão persistida e deixe a sala pronta', async () => {
  const playerRepository = new InMemoryPlayerRepository();
  await createProfessionalPlayer(playerRepository, '502', 'Host Jogador');
  await createProfessionalPlayer(playerRepository, '503', 'Visitante Jogador');
  const lobbyRepository = new InMemoryMultiplayerLobbyRepository(playerRepository);
  const createService = new CreateLobbyService(lobbyRepository, () => 'READY1');
  const joinService = new JoinLobbyService(lobbyRepository);

  await createService.execute('502');
  const joined = await joinService.execute('503', 'READY1');

  assert.equal(joined.status, MultiplayerLobbyStatus.Ready);
  assert.equal(joined.participants.length, 2);
  assert.equal(joined.canStartMatchPreparation, true);
  assert.ok(joined.readyForMatchAt instanceof Date);
});

test('consulta o estado da sessão multiplayer pelo participante', async () => {
  const playerRepository = new InMemoryPlayerRepository();
  await createProfessionalPlayer(playerRepository, '504', 'Host Status');
  await createProfessionalPlayer(playerRepository, '505', 'Visitante Status');
  const lobbyRepository = new InMemoryMultiplayerLobbyRepository(playerRepository);
  const createService = new CreateLobbyService(lobbyRepository, () => 'STATE1');
  const joinService = new JoinLobbyService(lobbyRepository);
  const statusService = new GetLobbyStatusService(lobbyRepository);

  await createService.execute('504');
  await joinService.execute('505', 'STATE1');
  const status = await statusService.execute('505');

  assert.equal(status.lobbyCode, 'STATE1');
  assert.equal(status.participants[0].playerName, 'Host Status');
  assert.equal(status.participants[1].playerName, 'Visitante Status');
});

test('previne entrada inválida quando a sala já está cheia', async () => {
  const playerRepository = new InMemoryPlayerRepository();
  await createProfessionalPlayer(playerRepository, '506', 'Host Cheia');
  await createProfessionalPlayer(playerRepository, '507', 'Visitante 1');
  await createProfessionalPlayer(playerRepository, '508', 'Visitante 2');
  const lobbyRepository = new InMemoryMultiplayerLobbyRepository(playerRepository);
  const createService = new CreateLobbyService(lobbyRepository, () => 'FULL01');
  const joinService = new JoinLobbyService(lobbyRepository);

  await createService.execute('506');
  await joinService.execute('507', 'FULL01');

  await assert.rejects(() => joinService.execute('508', 'FULL01'), /já está cheia/);
});

test('dispatcher do bot integra o fluxo mínimo do multiplayer MVP sem quebrar o menu atual', async () => {
  const playerRepository = new InMemoryPlayerRepository();
  await createProfessionalPlayer(playerRepository, '509', 'Host Bot');
  await createProfessionalPlayer(playerRepository, '510', 'Guest Bot');
  const lobbyRepository = new InMemoryMultiplayerLobbyRepository(playerRepository);

  const facade = new Phase1TelegramFacade(
    new CreatePlayerService(playerRepository),
    new GetPlayerCardService(playerRepository),
    new GetCareerStatusService(playerRepository),
    new GetCareerHistoryService(playerRepository),
    new GetWalletStatementService(playerRepository),
    new WeeklyTrainingService(playerRepository),
    new TryoutService(playerRepository, new InMemoryClubRepository()),
    new DisabledService(),
    new DisabledService(),
    new DisabledService(),
    new CreateLobbyService(lobbyRepository, () => 'BOT123'),
    new JoinLobbyService(lobbyRepository),
    new GetLobbyStatusService(lobbyRepository)
  );

  const dispatcher = new Phase1TelegramDispatcher(facade, new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore()));

  const mainMenu = await dispatcher.dispatch({ telegramId: '509', text: '/start' });
  assert.ok(mainMenu.actions.includes(phase1BotActions.multiplayerMenu));

  const createLobbyReply = await dispatcher.dispatch({ telegramId: '509', text: '/criar-sala' });
  assert.match(createLobbyReply.text, /Sala: BOT123/);
  assert.match(createLobbyReply.text, /Aguardando adversário/);

  const joinReply = await dispatcher.dispatch({ telegramId: '510', text: '/entrar-sala BOT123' });
  assert.match(joinReply.text, /Participantes: 2\/2/);
  assert.match(joinReply.text, /Pronta/);

  const statusReply = await dispatcher.dispatch({ telegramId: '510', text: '/sala' });
  assert.match(statusReply.text, /MULTIPLAYER MVP/);
  assert.match(statusReply.text, /Preparação multiplayer liberada/);
});
