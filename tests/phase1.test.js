const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CreatePlayerService,
  GetCareerHistoryService,
  GetCareerStatusService,
  GetPlayerCardService,
  GetWalletStatementService,
  TryoutService,
  WeeklyTrainingService,
  phase1Economy
} = require('../dist/domain/player/services.js');
const { InMemoryPlayerCreationConversationStore } = require('../dist/bot/conversation-store.js');
const { Phase1TelegramDispatcher } = require('../dist/bot/phase1-dispatcher.js');
const { Phase1TelegramFacade, phase1BotActions } = require('../dist/bot/phase1-bot.js');
const { Phase1PlayerCreationFlow } = require('../dist/bot/player-creation-flow.js');
const { AttributeKey, CareerStatus, DominantFoot, HistoryEntryType, PlayerPosition, TryoutStatus, WalletTransactionType } = require('../dist/domain/shared/enums.js');
const { PrismaPlayerCreationConversationStore } = require('../dist/infra/prisma/player-creation-conversation-store.js');
const { PrismaPlayerRepository, buildTrainingSessionCreateData } = require('../dist/infra/prisma/player-repository.js');
const { setPrismaClientForTests } = require('../dist/infra/prisma/client.js');
const { TelegramBotApiClient } = require('../dist/infra/telegram/client.js');
const { botReplyToTelegramMessage } = require('../dist/infra/telegram/presenter.js');
const { Phase1TelegramRuntime } = require('../dist/infra/telegram/runtime.js');
const { createRailwayTelegramServer } = require('../dist/infra/http/railway-telegram-server.js');
const { DomainError } = require('../dist/shared/errors.js');

class InMemoryPlayerRepository {
  constructor() {
    this.playersByTelegramId = new Map();
    this.trainingWeeks = new Set();
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
      createdAt: new Date('2026-01-05T00:00:00.000Z'),
      attributes: { ...input.attributes },
      trainingHistoryCount: 0,
      tryoutHistoryCount: 0
    };
    this.playersByTelegramId.set(input.telegramId, player);
    this.historyByPlayerId.set(
      player.id,
      input.initialHistory.map((entry) => ({ ...entry, createdAt: new Date('2026-01-05T00:00:00.000Z') }))
    );
    this.tryoutsByPlayerId.set(player.id, []);
    this.walletTransactionsByPlayerId.set(
      player.id,
      input.initialTransactions.map((transaction) => ({
        ...transaction,
        createdAt: new Date('2026-01-05T00:00:00.000Z')
      }))
    );
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

    const history = this.historyByPlayerId.get(player.id) ?? [];
    const tryouts = this.tryoutsByPlayerId.get(player.id) ?? [];
    const latestTryout = tryouts.at(-1);
    const trainingWeeks = [...this.trainingWeeks]
      .filter((key) => key.startsWith(`${player.id}:`))
      .map((key) => Number(key.split(':')[1]))
      .sort((a, b) => b - a);

    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      age: player.age,
      currentClubName: player.currentClubName,
      walletBalance: player.walletBalance,
      totalTrainings: player.trainingHistoryCount,
      totalTryouts: player.tryoutHistoryCount,
      lastTrainingWeek: trainingWeeks[0],
      trainingAvailableThisWeek: trainingWeeks[0] !== currentWeekNumber,
      currentWeekNumber,
      latestTryout,
      recentHistory: history.slice(-5).reverse()
    };
  }


  async getCareerHistoryByTelegramId(telegramId, limit) {
    const player = await this.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    const history = (this.historyByPlayerId.get(player.id) ?? []).slice(-limit).reverse();
    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      currentClubName: player.currentClubName,
      totalEntries: this.historyByPlayerId.get(player.id)?.length ?? 0,
      entries: history
    };
  }

  async getWalletStatementByTelegramId(telegramId, transactionLimit) {
    const player = await this.findByTelegramId(telegramId);
    if (!player) {
      return null;
    }

    const transactions = this.walletTransactionsByPlayerId.get(player.id) ?? [];
    return {
      playerId: player.id,
      playerName: player.name,
      careerStatus: player.careerStatus,
      walletBalance: player.walletBalance,
      transactionCount: Math.min(transactionLimit, transactions.length),
      recentTransactions: transactions.slice(-transactionLimit).reverse()
    };
  }

  async applyTraining(params) {
    const player = [...this.playersByTelegramId.values()].find((entry) => entry.id === params.playerId);
    const weekKey = `${params.playerId}:${params.weekNumber}`;
    if (this.trainingWeeks.has(weekKey)) {
      throw new DomainError('O treino desta semana já foi utilizado.');
    }
    this.trainingWeeks.add(weekKey);
    player.walletBalance -= params.cost;
    player.attributes[params.focus] += params.attributeGain;
    player.trainingHistoryCount += 1;
    this.historyByPlayerId.get(player.id).push({
      type: params.historyEntry.type,
      description: params.historyEntry.description,
      createdAt: new Date(`2026-01-${String(5 + params.weekNumber).padStart(2, '0')}T00:00:00.000Z`)
    });
    this.walletTransactionsByPlayerId.get(player.id).push({
      ...params.walletTransaction,
      createdAt: new Date(`2026-01-${String(5 + params.weekNumber).padStart(2, '0')}T00:00:00.000Z`)
    });
    return {
      playerId: player.id,
      focus: params.focus,
      newValue: player.attributes[params.focus],
      cost: params.cost,
      walletBalance: player.walletBalance,
      weekNumber: params.weekNumber
    };
  }

  async registerTryout(params) {
    const player = [...this.playersByTelegramId.values()].find((entry) => entry.id === params.playerId);
    player.walletBalance -= params.cost;
    player.tryoutHistoryCount += 1;
    const status = params.approvedClubId ? TryoutStatus.Approved : TryoutStatus.Failed;
    if (params.approvedClubId && params.approvedClubName) {
      player.careerStatus = CareerStatus.Professional;
      player.currentClubId = params.approvedClubId;
      player.currentClubName = params.approvedClubName;
    }
    this.tryoutsByPlayerId.get(player.id).push({
      status,
      score: params.score,
      requiredScore: params.requiredScore,
      clubName: params.approvedClubName,
      createdAt: new Date(`2026-02-${String(params.weekNumber).padStart(2, '0')}T00:00:00.000Z`)
    });
    this.walletTransactionsByPlayerId.get(player.id).push({
      ...params.walletTransaction,
      createdAt: new Date(`2026-02-${String(params.weekNumber).padStart(2, '0')}T00:00:00.000Z`)
    });
    for (const entry of params.historyEntries) {
      this.historyByPlayerId.get(player.id).push({
        type: entry.type,
        description: entry.description,
        createdAt: new Date(`2026-02-${String(params.weekNumber).padStart(2, '0')}T00:00:00.000Z`)
      });
    }
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

test('cria jogador com carteira inicial e ficha consultável', async () => {
  const repo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const getPlayerCardService = new GetPlayerCardService(repo);

  await createPlayerService.execute({
    telegramId: '101',
    name: 'Caio Silva',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 176,
    weightKg: 70,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const card = await getPlayerCardService.execute('101');
  assert.equal(card.age, 14);
  assert.equal(card.walletBalance, phase1Economy.startingWalletBalance);
  assert.ok(card.attributes[AttributeKey.Shooting] > card.attributes[AttributeKey.Marking]);
});

test('permite apenas um treino por semana e aplica ganho persistido', async () => {
  const repo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const trainingService = new WeeklyTrainingService(repo);

  await createPlayerService.execute({
    telegramId: '102',
    name: 'Lucas Nunes',
    nationality: 'Brasil',
    position: PlayerPosition.Midfielder,
    dominantFoot: DominantFoot.Left,
    heightCm: 172,
    weightKg: 66,
    visual: { skinTone: 'clara', hairStyle: 'ondulado' }
  });

  const first = await trainingService.execute('102', AttributeKey.Passing, new Date('2026-01-06T00:00:00.000Z'));
  assert.equal(first.cost, phase1Economy.trainingCost);
  assert.ok(first.newValue > 34);

  await assert.rejects(
    () => trainingService.execute('102', AttributeKey.Passing, new Date('2026-01-07T00:00:00.000Z')),
    /treino desta semana/
  );
});

test('impede treino semanal sem saldo suficiente', async () => {
  const repo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const trainingService = new WeeklyTrainingService(repo);

  await createPlayerService.execute({
    telegramId: '104',
    name: 'Rafael Lima',
    nationality: 'Brasil',
    position: PlayerPosition.Defender,
    dominantFoot: DominantFoot.Right,
    heightCm: 181,
    weightKg: 77,
    visual: { skinTone: 'parda', hairStyle: 'cacheado' }
  });

  const player = await repo.findByTelegramId('104');
  player.walletBalance = 0;

  await assert.rejects(
    () => trainingService.execute('104', AttributeKey.Marking, new Date('2026-01-06T00:00:00.000Z')),
    /Saldo insuficiente/
  );
});

test('cobra peneira, pode reprovar e promove ao profissional quando aprovado', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const tryoutService = new TryoutService(repo, clubs);

  await createPlayerService.execute({
    telegramId: '103',
    name: 'Pedro Goleiro',
    nationality: 'Brasil',
    position: PlayerPosition.Goalkeeper,
    dominantFoot: DominantFoot.Right,
    heightCm: 191,
    weightKg: 84,
    visual: { skinTone: 'negra', hairStyle: 'raspado' }
  });

  const player = await repo.findByTelegramId('103');
  player.attributes[AttributeKey.Passing] = 10;
  player.attributes[AttributeKey.Shooting] = 10;
  player.attributes[AttributeKey.Dribbling] = 10;
  player.attributes[AttributeKey.Speed] = 10;
  player.attributes[AttributeKey.Marking] = 10;
  player.attributes[AttributeKey.Positioning] = 20;
  player.attributes[AttributeKey.Reflexes] = 25;

  const failed = await tryoutService.execute('103', new Date('2026-01-06T00:00:00.000Z'));
  assert.equal(failed.status, TryoutStatus.Failed);

  player.attributes[AttributeKey.Passing] = 30;
  player.attributes[AttributeKey.Shooting] = 20;
  player.attributes[AttributeKey.Dribbling] = 20;
  player.attributes[AttributeKey.Speed] = 20;
  player.attributes[AttributeKey.Marking] = 20;
  player.attributes[AttributeKey.Positioning] = 20;
  player.attributes[AttributeKey.Reflexes] = 40;

  const approved = await tryoutService.execute('103', new Date('2026-01-13T00:00:00.000Z'));
  assert.equal(approved.status, TryoutStatus.Approved);
  assert.equal(approved.clubName, 'Porto Azul FC');

  const updated = await repo.findByTelegramId('103');
  assert.equal(updated.careerStatus, CareerStatus.Professional);
});

test('expõe status da carreira com disponibilidade de treino, última peneira e histórico recente', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const trainingService = new WeeklyTrainingService(repo);
  const tryoutService = new TryoutService(repo, clubs);
  const careerStatusService = new GetCareerStatusService(repo);

  await createPlayerService.execute({
    telegramId: '105',
    name: 'Bruno Costa',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Left,
    heightCm: 178,
    weightKg: 72,
    visual: { skinTone: 'clara', hairStyle: 'curto' }
  });

  await trainingService.execute('105', AttributeKey.Shooting, new Date('2026-01-06T00:00:00.000Z'));
  await tryoutService.execute('105', new Date('2026-01-13T00:00:00.000Z'));

  const status = await careerStatusService.execute('105', new Date('2026-01-13T00:00:00.000Z'));
  assert.equal(status.currentWeekNumber, 2);
  assert.equal(status.totalTrainings, 1);
  assert.equal(status.totalTryouts, 1);
  assert.equal(status.trainingAvailableThisWeek, true);
  assert.equal(status.latestTryout.status, TryoutStatus.Approved);
  assert.equal(status.latestTryout.clubName, 'Porto Azul FC');
  assert.equal(status.recentHistory[0].type, HistoryEntryType.ProfessionalContractStarted);
});

test('expõe extrato da carteira com transações recentes de treino e peneira', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const trainingService = new WeeklyTrainingService(repo);
  const tryoutService = new TryoutService(repo, clubs);
  const walletStatementService = new GetWalletStatementService(repo);

  await createPlayerService.execute({
    telegramId: '106',
    name: 'Diego Luz',
    nationality: 'Brasil',
    position: PlayerPosition.Midfielder,
    dominantFoot: DominantFoot.Right,
    heightCm: 174,
    weightKg: 68,
    visual: { skinTone: 'parda', hairStyle: 'ondulado' }
  });

  await trainingService.execute('106', AttributeKey.Passing, new Date('2026-01-06T00:00:00.000Z'));
  await tryoutService.execute('106', new Date('2026-01-13T00:00:00.000Z'));

  const statement = await walletStatementService.execute('106');
  assert.equal(statement.walletBalance, 95);
  assert.equal(statement.transactionCount, 3);
  assert.equal(statement.recentTransactions[0].type, WalletTransactionType.TryoutCost);
  assert.equal(statement.recentTransactions[1].type, WalletTransactionType.TrainingCost);
  assert.equal(statement.recentTransactions[2].type, WalletTransactionType.InitialGrant);
});

test('valida limite permitido do extrato da carteira', async () => {
  const repo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const walletStatementService = new GetWalletStatementService(repo);

  await createPlayerService.execute({
    telegramId: '107',
    name: 'Marcos Vale',
    nationality: 'Brasil',
    position: PlayerPosition.Defender,
    dominantFoot: DominantFoot.Left,
    heightCm: 180,
    weightKg: 75,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  await assert.rejects(() => walletStatementService.execute('107', 0), /limite do extrato/);
});

test('a facade do bot entrega texto de status de carreira coerente com o fluxo atual', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const getPlayerCardService = new GetPlayerCardService(repo);
  const getCareerStatusService = new GetCareerStatusService(repo);
  const getCareerHistoryService = new GetCareerHistoryService(repo);
  const getWalletStatementService = new GetWalletStatementService(repo);
  const trainingService = new WeeklyTrainingService(repo);
  const tryoutService = new TryoutService(repo, clubs);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getCareerHistoryService,
    getWalletStatementService,
    trainingService,
    tryoutService
  );

  await facade.handleCreatePlayer({
    telegramId: '108',
    name: 'Cadu Melo',
    nationality: 'Brasil',
    position: PlayerPosition.Midfielder,
    dominantFoot: DominantFoot.Right,
    heightCm: 174,
    weightKg: 68,
    visual: { skinTone: 'parda', hairStyle: 'ondulado' }
  });

  const reply = await facade.handleCareerStatus('108');
  assert.match(reply.text, /Status da carreira de Cadu Melo/);
  assert.match(reply.text, /Treino da semana: disponível/);
  assert.ok(reply.actions.includes('Extrato da carteira'));
});

test('a facade do bot entrega extrato da carteira com labels legíveis', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const getPlayerCardService = new GetPlayerCardService(repo);
  const getCareerStatusService = new GetCareerStatusService(repo);
  const getCareerHistoryService = new GetCareerHistoryService(repo);
  const getWalletStatementService = new GetWalletStatementService(repo);
  const trainingService = new WeeklyTrainingService(repo);
  const tryoutService = new TryoutService(repo, clubs);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getCareerHistoryService,
    getWalletStatementService,
    trainingService,
    tryoutService
  );

  await facade.handleCreatePlayer({
    telegramId: '109',
    name: 'Igor Reis',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 177,
    weightKg: 71,
    visual: { skinTone: 'clara', hairStyle: 'curto' }
  });
  await facade.handleWeeklyTraining('109', AttributeKey.Shooting);

  const reply = await facade.handleWalletStatement('109');
  assert.match(reply.text, /Extrato da carteira de Igor Reis/);
  assert.match(reply.text, /Custo de treino: -20/);
  assert.ok(reply.actions.includes('Status da carreira'));
});

test('o payload de persistência do treino contém apenas campos válidos da tabela', async () => {
  assert.deepEqual(
    buildTrainingSessionCreateData({
      playerId: 'player-1',
      weekNumber: 2,
      focus: AttributeKey.Passing,
      cost: 20,
      attributeGain: 2
    }),
    {
      playerId: 'player-1',
      weekNumber: 2,
      focus: AttributeKey.Passing,
      cost: 20,
      attributeGain: 2
    }
  );
});

test('o repositório Prisma não envia walletTransaction nem historyEntry ao create de TrainingSession', async () => {
  let capturedCreateData;

  const fakeTransactionClient = {
    trainingSession: {
      findUnique: async () => null,
      create: async (args) => {
        capturedCreateData = args.data;
        return { id: 'training-1' };
      }
    },
    player: {
      findUnique: async () => ({
        wallet: { balance: 150 },
        attributes: [{ key: AttributeKey.Passing, value: 34 }]
      })
    },
    playerAttribute: {
      update: async () => ({})
    },
    wallet: {
      update: async () => ({ balance: 130 })
    },
    playerHistoryEntry: {
      create: async () => ({})
    }
  };

  setPrismaClientForTests({
    $transaction: async (callback) => callback(fakeTransactionClient),
    user: {},
    playerGeneration: {},
    player: {},
    club: {},
    trainingSession: {},
    playerAttribute: {},
    wallet: {},
    playerHistoryEntry: {},
    tryoutAttempt: {},
    clubMembership: {},
    playerCreationConversation: {}
  });

  const repository = new PrismaPlayerRepository();
  const result = await repository.applyTraining({
    playerId: 'player-1',
    weekNumber: 2,
    focus: AttributeKey.Passing,
    cost: 20,
    attributeGain: 2,
    walletTransaction: {
      type: 'TRAINING_COST',
      amount: -20,
      description: 'Treino semanal de PASSING'
    },
    historyEntry: {
      type: 'TRAINING_COMPLETED',
      description: 'Treino semanal concluído',
      metadata: { focus: AttributeKey.Passing }
    }
  });

  assert.deepEqual(capturedCreateData, {
    playerId: 'player-1',
    weekNumber: 2,
    focus: AttributeKey.Passing,
    cost: 20,
    attributeGain: 2
  });
  assert.equal(result.newValue, 36);
  assert.equal(result.walletBalance, 130);

  setPrismaClientForTests(null);
});


test('dispatcher abre prompt de criação no /start quando ainda não existe jogador', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const facade = new Phase1TelegramFacade(
    new CreatePlayerService(repo),
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const dispatcher = new Phase1TelegramDispatcher(facade, new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore()));

  const reply = await dispatcher.dispatch({ telegramId: '110', text: '/start' });
  assert.match(reply.text, /Bem-vindo ao TeleSoccer/);
  assert.deepEqual(reply.actions, [phase1BotActions.createPlayer]);
});

test('dispatcher abre menu principal e roteia comandos reais do bot', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const dispatcher = new Phase1TelegramDispatcher(facade, new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore()));

  await createPlayerService.execute({
    telegramId: '111',
    name: 'Nando Luz',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 176,
    weightKg: 70,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const startReply = await dispatcher.dispatch({ telegramId: '111', text: '/start' });
  assert.match(startReply.text, /Painel do jogador/);
  assert.ok(startReply.actions.includes(phase1BotActions.weeklyTraining));

  const trainingMenuReply = await dispatcher.dispatch({ telegramId: '111', text: '/treino' });
  assert.match(trainingMenuReply.text, /Cada treino custa 20 moedas/);
  assert.ok(trainingMenuReply.actions.includes(phase1BotActions.trainingPassing));

  const trainingReply = await dispatcher.dispatch({ telegramId: '111', text: phase1BotActions.trainingPassing });
  assert.match(trainingReply.text, /Treino concluído em PASSING/);

  const walletReply = await dispatcher.dispatch({ telegramId: '111', text: '/carteira' });
  assert.match(walletReply.text, /Extrato da carteira de Nando Luz/);

  const tryoutPrompt = await dispatcher.dispatch({ telegramId: '111', text: '/peneira' });
  assert.match(tryoutPrompt.text, /Esta tentativa custa 35 moedas/);
  assert.ok(tryoutPrompt.actions.includes(phase1BotActions.confirmTryout));
});

test('dispatcher trata erro de domínio com retorno consistente para o bot', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const dispatcher = new Phase1TelegramDispatcher(facade, new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore()));

  await createPlayerService.execute({
    telegramId: '112',
    name: 'Luan Costa',
    nationality: 'Brasil',
    position: PlayerPosition.Defender,
    dominantFoot: DominantFoot.Left,
    heightCm: 182,
    weightKg: 77,
    visual: { skinTone: 'clara', hairStyle: 'curto' }
  });

  await dispatcher.dispatch({ telegramId: '112', text: phase1BotActions.trainingMarking });
  const errorReply = await dispatcher.dispatch({ telegramId: '112', text: phase1BotActions.trainingMarking });

  assert.match(errorReply.text, /Não foi possível concluir a ação/);
  assert.ok(errorReply.actions.includes(phase1BotActions.mainMenu));
});


test('dispatcher conduz criação conversacional completa do jogador', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const creationFlow = new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore());
  const dispatcher = new Phase1TelegramDispatcher(facade, creationFlow);

  let reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.createPlayer });
  assert.match(reply.text, /Etapa 1\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: 'Caio Rocha' });
  assert.match(reply.text, /Etapa 2\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: 'Brasil' });
  assert.match(reply.text, /Etapa 3\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.positionForward });
  assert.match(reply.text, /Etapa 4\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.footRight });
  assert.match(reply.text, /Etapa 5\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: '178' });
  assert.match(reply.text, /Etapa 6\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: '72' });
  assert.match(reply.text, /Etapa 7\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.skinToneTan });
  assert.match(reply.text, /Etapa 8\/9/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.hairStyleShort });
  assert.match(reply.text, /Etapa 9\/9/);
  assert.match(reply.text, /Caio Rocha/);

  reply = await dispatcher.dispatch({ telegramId: '113', text: phase1BotActions.confirmCreatePlayer });
  assert.match(reply.text, /criado com sucesso/);

  const createdPlayer = await repo.findByTelegramId('113');
  assert.equal(createdPlayer.name, 'Caio Rocha');
});

test('dispatcher permite cancelar criação conversacional com segurança', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const facade = new Phase1TelegramFacade(
    new CreatePlayerService(repo),
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const creationFlow = new Phase1PlayerCreationFlow(new InMemoryPlayerCreationConversationStore());
  const dispatcher = new Phase1TelegramDispatcher(facade, creationFlow);

  await dispatcher.dispatch({ telegramId: '114', text: phase1BotActions.createPlayer });
  const cancelReply = await dispatcher.dispatch({ telegramId: '114', text: '/cancelar' });

  assert.match(cancelReply.text, /cancelada com segurança/);
  assert.equal(await repo.findByTelegramId('114'), null);
});


test('store Prisma persiste e remove sessão de criação conversacional', async () => {
  let persistedSession = null;

  setPrismaClientForTests({
    $transaction: async () => {
      throw new Error('não deveria usar transação neste teste');
    },
    user: {},
    playerGeneration: {},
    player: {},
    club: {},
    trainingSession: {},
    playerAttribute: {},
    wallet: {},
    playerHistoryEntry: {},
    tryoutAttempt: {},
    clubMembership: {},
    playerCreationConversation: {
      findUnique: async ({ where }) => (persistedSession && persistedSession.telegramId === where.telegramId ? persistedSession : null),
      upsert: async ({ create, update, where }) => {
        persistedSession = { telegramId: where.telegramId, ...create, ...update };
        return persistedSession;
      },
      deleteMany: async ({ where }) => {
        if (persistedSession && persistedSession.telegramId === where.telegramId) {
          persistedSession = null;
        }
        return { count: 1 };
      }
    }
  });

  const store = new PrismaPlayerCreationConversationStore();
  await store.save({
    telegramId: 'session-1',
    step: 'position',
    draft: {
      name: 'Ruan',
      nationality: 'Brasil',
      visual: {}
    }
  });

  const loaded = await store.get('session-1');
  assert.equal(loaded.step, 'position');
  assert.equal(loaded.draft.name, 'Ruan');

  await store.clear('session-1');
  assert.equal(await store.get('session-1'), null);

  setPrismaClientForTests(null);
});


test('fluxo de criação continua normalmente quando a sessão ainda está válida', async () => {
  const store = new InMemoryPlayerCreationConversationStore();
  const flow = new Phase1PlayerCreationFlow(store);

  await store.save({
    telegramId: 'active-session',
    step: 'nationality',
    draft: { name: 'Rafael' },
    updatedAt: new Date()
  });

  const expirationReply = await flow.expireIfNeeded('active-session', new Date());
  assert.equal(expirationReply, null);

  const reply = await flow.remindCurrentStep('active-session');
  assert.match(reply.text, /Etapa 2\/9/);
});

test('fluxo de criação expira sessão antiga, limpa e orienta reinício', async () => {
  const store = new InMemoryPlayerCreationConversationStore();
  const flow = new Phase1PlayerCreationFlow(store);

  await store.save({
    telegramId: 'expired-session',
    step: 'position',
    draft: { name: 'Vitor', nationality: 'Brasil' },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

  const expirationReply = await flow.expireIfNeeded('expired-session', new Date('2026-01-01T01:00:00.000Z'));
  assert.match(expirationReply.text, /sessão de criação expirou/);
  assert.equal(await store.get('expired-session'), null);
});

test('dispatcher informa expiração e oferece reinício ao receber mensagem após timeout', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const store = new InMemoryPlayerCreationConversationStore();
  const flow = new Phase1PlayerCreationFlow(store);
  const facade = new Phase1TelegramFacade(
    new CreatePlayerService(repo),
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );
  const dispatcher = new Phase1TelegramDispatcher(facade, flow);

  await store.save({
    telegramId: '115',
    step: 'weightKg',
    draft: {
      name: 'Leo',
      nationality: 'Brasil',
      position: PlayerPosition.Forward,
      dominantFoot: DominantFoot.Right,
      heightCm: 176,
      visual: {}
    },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

  const originalDateNow = Date.now;
  Date.now = () => new Date('2026-01-01T01:00:00.000Z').getTime();

  const reply = await dispatcher.dispatch({ telegramId: '115', text: '72' });

  Date.now = originalDateNow;

  assert.match(reply.text, /sessão de criação expirou/);
  assert.ok(reply.actions.includes(phase1BotActions.createPlayer));
  assert.equal(await store.get('115'), null);
});

test('serviço e facade expõem histórico detalhado da carreira', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const trainingService = new WeeklyTrainingService(repo);
  const tryoutService = new TryoutService(repo, clubs);
  const historyService = new GetCareerHistoryService(repo);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    historyService,
    new GetWalletStatementService(repo),
    trainingService,
    tryoutService
  );

  await createPlayerService.execute({
    telegramId: '116',
    name: 'Sergio Vale',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 180,
    weightKg: 73,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });
  await trainingService.execute('116', AttributeKey.Shooting, new Date('2026-01-06T00:00:00.000Z'));
  await tryoutService.execute('116', new Date('2026-01-13T00:00:00.000Z'));

  const history = await historyService.execute('116');
  assert.equal(history.totalEntries, 4);
  assert.equal(history.entries[0].type, HistoryEntryType.ProfessionalContractStarted);

  const reply = await facade.handleCareerHistory('116');
  assert.match(reply.text, /Histórico da carreira de Sergio Vale/);
  assert.match(reply.text, /Eventos exibidos: 4\/4/);
  assert.ok(reply.actions.includes(phase1BotActions.careerHistory));
});

test('extrato da carteira e histórico ocultam peneira após promoção ao profissional', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    new GetCareerStatusService(repo),
    new GetCareerHistoryService(repo),
    new GetWalletStatementService(repo),
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs)
  );

  await createPlayerService.execute({
    telegramId: '117',
    name: 'Andre Luz',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 177,
    weightKg: 71,
    visual: { skinTone: 'clara', hairStyle: 'curto' }
  });

  const player = await repo.findByTelegramId('117');
  player.attributes[AttributeKey.Passing] = 30;
  player.attributes[AttributeKey.Shooting] = 20;
  player.attributes[AttributeKey.Dribbling] = 20;
  player.attributes[AttributeKey.Speed] = 20;
  player.attributes[AttributeKey.Marking] = 20;
  player.attributes[AttributeKey.Positioning] = 20;
  player.attributes[AttributeKey.Reflexes] = 40;

  await facade.handleTryout('117');

  const walletReply = await facade.handleWalletStatement('117');
  const historyReply = await facade.handleCareerHistory('117');
  assert.equal(walletReply.actions.includes(phase1BotActions.tryout), false);
  assert.equal(historyReply.actions.includes(phase1BotActions.tryout), false);
});

test('presenter converte resposta do bot em teclado do Telegram', async () => {
  const payload = botReplyToTelegramMessage(12345, {
    text: 'Painel',
    actions: [phase1BotActions.playerCard, phase1BotActions.careerStatus, phase1BotActions.weeklyTraining]
  });

  assert.equal(payload.chat_id, 12345);
  assert.equal(payload.reply_markup.keyboard.length, 2);
  assert.deepEqual(payload.reply_markup.keyboard[0], [
    { text: phase1BotActions.playerCard },
    { text: phase1BotActions.careerStatus }
  ]);
});

test('runtime do Telegram despacha update real e envia mensagem formatada', async () => {
  const sentMessages = [];
  const dispatcher = {
    dispatch: async ({ telegramId, text }) => ({
      text: `Recebido ${telegramId}:${text}`,
      actions: [phase1BotActions.mainMenu]
    })
  };
  const runtime = new Phase1TelegramRuntime(dispatcher, {
    sendMessage: async (payload) => {
      sentMessages.push(payload);
    },
    setWebhook: async () => {}
  });

  const processed = await runtime.processUpdate({
    update_id: 1,
    message: {
      message_id: 99,
      text: '/start',
      chat: { id: 54321, type: 'private' },
      from: { id: 777 }
    }
  });

  assert.equal(processed, true);
  assert.equal(sentMessages[0].chat_id, 54321);
  assert.match(sentMessages[0].text, /Recebido 777:\/start/);
});

test('cliente Telegram usa Bot API real por HTTP', async () => {
  const requests = [];
  const client = new TelegramBotApiClient('token-123', async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({ ok: true, result: true })
    };
  });

  await client.sendMessage({ chat_id: 1, text: 'Olá' });
  await client.setWebhook('https://tele.example/webhook', 'secret');

  assert.match(String(requests[0].url), /sendMessage/);
  assert.match(String(requests[1].url), /setWebhook/);
  assert.match(requests[1].init.body, /secret/);
});

test('servidor Railway expõe healthcheck e processa webhook do Telegram', async () => {
  const originalFetch = global.fetch;
  const port = 3400 + Math.floor(Math.random() * 200);
  const telegramFetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, result: true })
  });

  const updates = [];
  const runtime = {
    processUpdate: async (update) => {
      updates.push(update);
      return true;
    }
  };
  const telegramClient = new TelegramBotApiClient('token-railway', telegramFetch);
  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgres://tele',
      TELEGRAM_BOT_TOKEN: 'token-railway',
      TELEGRAM_WEBHOOK_SECRET: 'railway-secret',
      APP_BASE_URL: 'https://tele.example',
      PORT: port,
      NODE_ENV: 'test'
    },
    runtime,
    telegramClient
  });

  await server.start();

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);

  const webhook = await fetch(`http://127.0.0.1:${port}/telegram/webhook/railway-secret`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ update_id: 2, message: { message_id: 5, chat: { id: 1, type: 'private' }, from: { id: 2 }, text: '/start' } })
  });
  assert.equal(webhook.status, 200);
  assert.equal(updates.length, 1);

  await server.stop();
  global.fetch = originalFetch;
});
