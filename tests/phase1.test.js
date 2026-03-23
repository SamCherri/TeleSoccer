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
const { AttributeKey, CareerStatus, DominantFoot, HistoryEntryType, PlayerCreationStep, PlayerPosition, TryoutStatus, WalletTransactionType } = require('../dist/domain/shared/enums.js');
const { PrismaPlayerCreationConversationStore } = require('../dist/infra/prisma/player-creation-conversation-store.js');
const { PrismaPlayerRepository, buildTrainingSessionCreateData } = require('../dist/infra/prisma/player-repository.js');
const { setPrismaClientForTests } = require('../dist/infra/prisma/client.js');
const { TelegramBotApiClient } = require('../dist/infra/telegram/client.js');
const { PrismaMatchRepository } = require('../dist/infra/prisma/match-repository.js');
const { MatchStatus, MatchHalf, MatchPossessionSide, MatchContextType, MatchTurnState, MatchActionKey } = require('../dist/domain/match/types.js');
const { botReplyToTelegramMessage } = require('../dist/infra/telegram/presenter.js');
const { Phase1TelegramRuntime } = require('../dist/infra/telegram/runtime.js');
const { rasterizeTelegramSceneSvgToPng } = require('../dist/infra/telegram/svg-png-rasterizer.js');
const { buildFinalWebhookUrl, createRailwayTelegramServer } = require('../dist/infra/http/railway-telegram-server.js');
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
  assert.ok(reply.actions.includes(phase1BotActions.weekAgenda));
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
  assert.ok(reply.actions.includes(phase1BotActions.careerStatus));
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
      player: { connect: { id: 'player-1' } },
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
    player: { connect: { id: 'player-1' } },
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

test('phase1BotActions está disponível no topo do teste para as navegações do mundo', async () => {
  assert.equal(typeof phase1BotActions.mainMenu, 'string');
  assert.equal(phase1BotActions.mainMenu, 'Continuar jornada');
  assert.equal(phase1BotActions.weekAgenda, 'Ver agenda da semana');
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
  assert.match(startReply.text, /MUNDO DO JOGADOR/);
  assert.ok(startReply.actions.includes(phase1BotActions.weeklyTraining));
  assert.ok(startReply.actions.includes(phase1BotActions.weekAgenda));
  assert.ok(startReply.actions.includes(phase1BotActions.playerCard));
  assert.ok(startReply.actions.includes(phase1BotActions.careerHistory));
  assert.ok(startReply.actions.includes(phase1BotActions.walletStatement));

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

test('dispatcher normaliza slash commands sem afetar botões textuais', async () => {
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
    telegramId: '111-upper',
    name: 'Nando Luz',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 176,
    weightKg: 70,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const lowerReply = await dispatcher.dispatch({ telegramId: '111-upper', text: '/start' });
  const upperReply = await dispatcher.dispatch({ telegramId: '111-upper', text: '/Start' });
  const capsReply = await dispatcher.dispatch({ telegramId: '111-upper', text: '/START' });

  assert.equal(upperReply.text, lowerReply.text);
  assert.deepEqual(upperReply.actions, lowerReply.actions);
  assert.equal(capsReply.text, lowerReply.text);
  assert.deepEqual(capsReply.actions, lowerReply.actions);
});


test('dispatcher normaliza slash commands com casing misto e menção ao bot', async () => {
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
    telegramId: '111-mention',
    name: 'Nando Luz',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 176,
    weightKg: 70,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const baseline = await dispatcher.dispatch({ telegramId: '111-mention', text: '/start' });
  const mentioned = await dispatcher.dispatch({ telegramId: '111-mention', text: '/START@TeleSoccerBot' });
  const mentionedWithArg = await dispatcher.dispatch({ telegramId: '111-mention', text: '/Sala@TeleSoccerBot abc123' });

  assert.equal(mentioned.text, baseline.text);
  assert.deepEqual(mentioned.actions, baseline.actions);
  assert.match(mentionedWithArg.text, /Multiplayer ainda não configurado neste ambiente de teste/);
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
  assert.ok(errorReply.actions.includes(phase1BotActions.invitations));
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



test('flow de criação persiste etapa usando enum forte do domínio', async () => {
  const store = new InMemoryPlayerCreationConversationStore();
  const flow = new Phase1PlayerCreationFlow(store);

  await flow.start('enum-user');
  const startedSession = await store.get('enum-user');
  assert.equal(startedSession.step, PlayerCreationStep.Name);

  await flow.handleInput('enum-user', 'Mateus Rocha');
  const progressedSession = await store.get('enum-user');
  assert.equal(progressedSession.step, PlayerCreationStep.Nationality);
});

test('flow de criação não mascara campos obrigatórios ausentes na confirmação final', async () => {
  const store = new InMemoryPlayerCreationConversationStore();
  const flow = new Phase1PlayerCreationFlow(store);

  await store.save({
    telegramId: 'broken-confirmation',
    step: PlayerCreationStep.Confirmation,
    draft: {
      name: 'Danilo',
      nationality: 'Brasil',
      dominantFoot: DominantFoot.Right,
      heightCm: 181,
      weightKg: 74,
      visual: { skinTone: 'morena', hairStyle: 'curto' }
    },
    updatedAt: new Date()
  });

  const result = await flow.handleInput('broken-confirmation', phase1BotActions.confirmCreatePlayer);

  assert.equal(result.kind, 'reply');
  assert.match(result.reply.text, /posição principal é obrigatória/);
  assert.notEqual(await store.get('broken-confirmation'), null);
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
    step: PlayerCreationStep.Position,
    draft: {
      name: 'Ruan',
      nationality: 'Brasil',
      visual: {}
    }
  });

  const loaded = await store.get('session-1');
  assert.equal(loaded.step, PlayerCreationStep.Position);
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
    step: PlayerCreationStep.Nationality,
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
    step: PlayerCreationStep.Position,
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
  assert.ok(reply.actions.includes(phase1BotActions.weekAgenda));
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

test('presenter inclui fallback textual e payload estruturado para cena visual', async () => {
  const payload = botReplyToTelegramMessage(77, {
    text: 'Painel do lance',
    actions: [phase1BotActions.currentMatch],
    scene: {
      key: 'shot',
      title: 'Chute',
      hud: 'finalização armada',
      phrase: 'Finalização armada mirando o gol.',
      svg: '<svg viewBox="0 0 10 10"></svg>',
      caption: 'HUD curta\nChute • Finalização armada mirando o gol.',
      fallbackText: 'Arte preparada para envio futuro no Telegram.'
    }
  });

  assert.equal(payload.text.includes('Painel do lance'), true);
  assert.equal(payload.scene.caption.includes('HUD curta'), true);
  assert.equal(payload.scene.key, 'shot');
  assert.match(payload.scene.svg, /<svg/);
  assert.equal(payload.scene.assetKeys, undefined);
});

test('rasterização SVG -> PNG gera payload PNG válido para foto do Telegram', async () => {
  const rendered = rasterizeTelegramSceneSvgToPng('<svg viewBox="0 0 10 10"></svg>', {
    key: 'goal',
    title: 'Gol',
    hud: "⚽ 1x0 • ⏱️ 33'",
    phrase: 'Explosão no ataque.',
    svg: '<svg viewBox="0 0 10 10"></svg>',
    caption: 'HUD curta\nGol • Explosão no ataque.',
    fallbackText: 'Cena alternativa pronta.',
    assetKeys: ['match-hud-placeholder'],
    replacementSlots: ['telegram.match.widget.hud']
  });

  assert.equal(rendered.width > 0, true);
  assert.equal(rendered.height > 0, true);
  assert.deepEqual(Array.from(rendered.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});


test('runtime faz fallback textual quando o envio da cena PNG falha', async () => {
  const deliveries = [];
  const runtime = new Phase1TelegramRuntime({
    dispatch: async () => ({
      text: 'HUD curta',
      actions: [phase1BotActions.currentMatch],
      scene: {
        key: 'goal',
        title: 'Gol',
        hud: "⚽ 1x0 • ⏱️ 33'",
        phrase: 'Explosão no ataque.',
        svg: '<svg viewBox="0 0 10 10"></svg>',
        caption: 'HUD curta\nGol • Explosão no ataque.',
        fallbackText: 'Cena alternativa pronta.'
      }
    })
  }, {
    sendMessage: async (payload) => { deliveries.push({ channel: 'message', payload }); },
    sendDocument: async () => {},
    sendPhoto: async () => { throw new Error('png upload failed'); },
    setWebhook: async () => {},
    getWebhookInfo: async () => ({}),
    deleteWebhook: async () => {}
  });

  const processed = await runtime.processUpdate({
    update_id: 2,
    message: {
      message_id: 100,
      text: '/start',
      chat: { id: 88, type: 'private' },
      from: { id: 77 }
    }
  });

  assert.equal(processed, true);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].channel, 'message');
  assert.match(deliveries[0].payload.text, /HUD curta/);
  assert.match(deliveries[0].payload.text, /Cena alternativa pronta/);
});

test('runtime envia foto PNG como mídia principal quando a cena existe', async () => {
  const sentMessages = [];
  const dispatcher = {
    dispatch: async () => ({
      text: 'HUD curta',
      actions: [phase1BotActions.currentMatch],
      scene: {
        key: 'shot',
        title: 'Chute',
        hud: "⚽ 0x0 • ⏱️ 12'",
        phrase: 'Finalização armada.',
        svg: '<svg viewBox="0 0 10 10"></svg>',
        caption: 'HUD curta\nChute • Finalização armada.',
        fallbackText: 'Cena alternativa pronta.'
      }
    })
  };
  const runtime = new Phase1TelegramRuntime(dispatcher, {
    sendMessage: async (payload) => { sentMessages.push({ channel: 'message', payload }); },
    sendDocument: async () => {},
    sendPhoto: async (payload) => { sentMessages.push({ channel: 'photo', payload }); },
    setWebhook: async () => {},
    getWebhookInfo: async () => ({}),
    deleteWebhook: async () => {}
  });

  const processed = await runtime.processUpdate({
    update_id: 3,
    message: { message_id: 1, text: '/start', chat: { id: 99, type: 'private' }, from: { id: 55 } }
  });

  assert.equal(processed, true);
  assert.equal(sentMessages[0].channel, 'photo');
  assert.equal(sentMessages[0].payload.photo.filename, 'match-scene-shot.png');
  assert.deepEqual(Array.from(sentMessages[0].payload.photo.data.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(sentMessages[0].payload.caption.includes('HUD curta'), true);
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
      sentMessages.push({ channel: 'message', payload });
    },
    sendDocument: async () => {},
    sendPhoto: async () => {},
    setWebhook: async () => {},
    getWebhookInfo: async () => ({}),
    deleteWebhook: async () => {}
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
  assert.equal(sentMessages[0].channel, 'message');
  assert.equal(sentMessages[0].payload.chat_id, 54321);
  assert.match(sentMessages[0].payload.text, /Recebido 777:\/start/);
});

test('cliente Telegram usa Bot API real por HTTP', async () => {
  const requests = [];
  const client = new TelegramBotApiClient('token-123', async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: true })
    };
  });

  await client.sendMessage({ chat_id: 1, text: 'Olá' });
  await client.setWebhook('https://tele.example/webhook', 'secret');

  assert.match(String(requests[0].url), /sendMessage/);
  assert.match(String(requests[1].url), /setWebhook/);
  assert.match(requests[1].init.body, /secret/);
});


test('cliente Telegram consulta e remove webhook pela Bot API real', async () => {
  const requests = [];
  const client = new TelegramBotApiClient('token-123', async (url, init) => {
    requests.push({ url, init });

    if (String(url).includes('getWebhookInfo')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, result: { url: 'https://tele.example/telegram/webhook/secret' } })
      };
    }

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: true })
    };
  });

  const webhookInfo = await client.getWebhookInfo();
  await client.deleteWebhook(false);

  assert.deepEqual(webhookInfo, { url: 'https://tele.example/telegram/webhook/secret' });
  assert.match(String(requests[0].url), /getWebhookInfo/);
  assert.equal(requests[0].init.body, '{}');
  assert.match(String(requests[1].url), /deleteWebhook/);
  assert.match(requests[1].init.body, /"drop_pending_updates":false/);
});

test('buildFinalWebhookUrl normaliza APP_BASE_URL e mantém path consistente com o secret', async () => {
  assert.equal(
    buildFinalWebhookUrl('https://tele.example///', '/telegram/webhook/diag-secret'),
    'https://tele.example/telegram/webhook/diag-secret'
  );
  assert.equal(
    buildFinalWebhookUrl(' https://tele.example/base/ ', '/telegram/webhook/diag-secret'),
    'https://tele.example/base/telegram/webhook/diag-secret'
  );
  assert.equal(buildFinalWebhookUrl(undefined, '/telegram/webhook/diag-secret'), undefined);
});

test('servidor Railway expõe diagnóstico bruto do webhook e permite resetar com a URL final do startup', async () => {
  const port = 3460 + Math.floor(Math.random() * 200);
  const observed = {
    setWebhook: [],
    deleteWebhook: [],
    getWebhookInfo: 0
  };
  const webhookInfos = [
    {
      url: 'https://wrong.example/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 3
    },
    {
      url: 'https://wrong.example/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 3
    },
    {
      url: 'https://tele.example/base/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 0
    }
  ];
  const runtime = {
    async processUpdate() {
      return true;
    }
  };
  const telegramClient = {
    async sendMessage() {},
    async sendDocument() {},
    async sendPhoto() {},
    async setWebhook(webhookUrl, secretToken) {
      observed.setWebhook.push({ webhookUrl, secretToken });
    },
    async getWebhookInfo() {
      const index = observed.getWebhookInfo;
      observed.getWebhookInfo += 1;
      return webhookInfos[index] ?? webhookInfos.at(-1);
    },
    async deleteWebhook(dropPendingUpdates) {
      observed.deleteWebhook.push(dropPendingUpdates);
    }
  };

  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://tele',
      TELEGRAM_BOT_TOKEN: 'token-visible-only-as-boolean',
      TELEGRAM_WEBHOOK_SECRET: 'diag-secret',
      APP_BASE_URL: 'https://tele.example/base///',
      PORT: port,
      NODE_ENV: 'test'
    },
    runtime,
    telegramClient
  });

  await server.start();

  assert.equal(server.webhookPath, '/telegram/webhook/diag-secret');
  assert.deepEqual(observed.setWebhook[0], {
    webhookUrl: 'https://tele.example/base/telegram/webhook/diag-secret',
    secretToken: 'diag-secret'
  });

  const infoResponse = await fetch(`http://127.0.0.1:${port}/debug/telegram-webhook-info`);
  assert.equal(infoResponse.status, 200);
  const infoPayload = await infoResponse.json();
  assert.deepEqual(infoPayload, {
    appBaseUrl: 'https://tele.example/base///',
    webhookPath: '/telegram/webhook/diag-secret',
    finalWebhookUrl: 'https://tele.example/base/telegram/webhook/diag-secret',
    registeredWebhookUrl: 'https://wrong.example/telegram/webhook/diag-secret',
    urlsMatch: false,
    webhookInfo: {
      url: 'https://wrong.example/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 3
    }
  });

  const resetResponse = await fetch(`http://127.0.0.1:${port}/debug/telegram-reset-webhook`, {
    method: 'POST'
  });
  assert.equal(resetResponse.status, 200);
  const resetPayload = await resetResponse.json();
  assert.deepEqual(resetPayload, {
    appBaseUrl: 'https://tele.example/base///',
    webhookPath: '/telegram/webhook/diag-secret',
    finalWebhookUrl: 'https://tele.example/base/telegram/webhook/diag-secret',
    registeredWebhookUrl: 'https://tele.example/base/telegram/webhook/diag-secret',
    urlsMatch: true,
    webhookInfo: {
      url: 'https://tele.example/base/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 0
    },
    before: {
      url: 'https://wrong.example/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 3
    },
    after: {
      url: 'https://tele.example/base/telegram/webhook/diag-secret',
      has_custom_certificate: false,
      pending_update_count: 0
    }
  });
  assert.deepEqual(observed.deleteWebhook, [false]);
  assert.deepEqual(observed.setWebhook[1], {
    webhookUrl: 'https://tele.example/base/telegram/webhook/diag-secret',
    secretToken: 'diag-secret'
  });

  await server.stop();
});

test('startup do servidor registra log estruturado com finalWebhookUrl', async () => {
  const port = 3670 + Math.floor(Math.random() * 200);
  const originalConsoleInfo = console.info;
  const messages = [];
  console.info = (...args) => {
    messages.push(args);
  };

  const runtime = {
    async processUpdate() {
      return true;
    }
  };
  const telegramClient = {
    async sendMessage() {},
    async sendDocument() {},
    async sendPhoto() {},
    async setWebhook() {},
    async getWebhookInfo() { return {}; },
    async deleteWebhook() {}
  };

  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://tele',
      TELEGRAM_WEBHOOK_SECRET: 'log-secret',
      APP_BASE_URL: 'https://tele.example/',
      PORT: port,
      NODE_ENV: 'test'
    },
    runtime,
    telegramClient
  });

  try {
    await server.start();
  } finally {
    console.info = originalConsoleInfo;
    await server.stop();
  }

  const startupLog = messages.find((entry) =>
    entry[0] === '[railway-telegram-server]'
    && typeof entry[1] === 'string'
    && entry[1].includes('startup-webhook-configuration')
  );

  assert.ok(startupLog);
  assert.match(startupLog[1], /"appBaseUrl":"https:\/\/tele.example\/"/);
  assert.match(startupLog[1], /"webhookPath":"\/telegram\/webhook\/log-secret"/);
  assert.match(startupLog[1], /"finalWebhookUrl":"https:\/\/tele.example\/telegram\/webhook\/log-secret"/);
  assert.match(startupLog[1], /"port":/);
});

test('servidor Railway expõe healthcheck e processa webhook do Telegram', async () => {
  const originalFetch = global.fetch;
  const port = 3400 + Math.floor(Math.random() * 200);
  const telegramFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ ok: true, result: true })
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
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'railway-secret'
    },
    body: JSON.stringify({ update_id: 2, message: { message_id: 5, chat: { id: 1, type: 'private' }, from: { id: 2 }, text: '/start' } })
  });
  assert.equal(webhook.status, 200);
  assert.equal(updates.length, 1);

  await server.stop();
  global.fetch = originalFetch;
});


test('servidor Railway rejeita webhook sem secret token válido e payload inválido', async () => {
  const processedUpdates = [];
  const runtime = {
    async processUpdate(update) {
      processedUpdates.push(update);
      return true;
    }
  };
  const telegramClient = {
    async sendMessage() {},
    async sendDocument() {},
    async sendPhoto() {},
    async setWebhook() {},
    async getWebhookInfo() { return {}; },
    async deleteWebhook() {}
  };

  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://tele',
      PORT: 3311,
      NODE_ENV: 'test',
      TELEGRAM_WEBHOOK_SECRET: 'secret-phase1'
    },
    runtime,
    telegramClient
  });

  await server.start();

  const unauthorizedResponse = await fetch('http://127.0.0.1:3311/telegram/webhook/secret-phase1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ update_id: 1 })
  });
  assert.equal(unauthorizedResponse.status, 401);

  const invalidJsonResponse = await fetch('http://127.0.0.1:3311/telegram/webhook/secret-phase1', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'secret-phase1'
    },
    body: '{invalid'
  });
  assert.equal(invalidJsonResponse.status, 400);

  const invalidPayloadResponse = await fetch('http://127.0.0.1:3311/telegram/webhook/secret-phase1', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'secret-phase1'
    },
    body: JSON.stringify({ update_id: 'wrong-type' })
  });
  assert.equal(invalidPayloadResponse.status, 400);
  assert.equal(processedUpdates.length, 0);

  await server.stop();
});



test('repositório Prisma separa create inicial do turno para respeitar o schema atual do MatchTurn', async () => {
  let capturedMatchCreate;
  let capturedMatchTurnCreate;
  let capturedMatchEventCreate;

  setPrismaClientForTests({
    $transaction: async (callback) => callback({
      match: {
        create: async (args) => {
          capturedMatchCreate = args;
          return { id: 'match-1' };
        },
        findUnique: async () => ({
          id: 'match-1',
          playerId: 'player-1',
          status: MatchStatus.InProgress,
          homeScore: 0,
          awayScore: 0,
          currentMinute: 1,
          currentHalf: MatchHalf.First,
          possessionSide: MatchPossessionSide.Home,
          stoppageMinutes: 0,
          userEnergy: 100,
          yellowCards: 0,
          redCards: 0,
          homeClub: { name: 'Porto Azul FC' },
          awayClub: { name: 'Real Aurora' },
          lineups: [],
          turns: [{
            id: 'turn-1',
            sequence: 1,
            minute: 1,
            half: MatchHalf.First,
            possessionSide: MatchPossessionSide.Home,
            contextType: MatchContextType.ReceivedFree,
            contextText: 'Primeiro lance',
            availableActions: [MatchActionKey.Pass],
            deadlineAt: new Date('2026-03-22T12:00:00.000Z'),
            state: MatchTurnState.Pending,
            isGoalkeeperContext: false,
            previousOutcome: null,
            events: [{ metadata: { visualEvent: { kind: 'duel' } } }]
          }],
          events: [],
          injuries: [],
          suspensions: []
        })
      },
      matchTurn: {
        create: async (args) => {
          capturedMatchTurnCreate = args;
          return { id: 'turn-1' };
        }
      },
      matchEvent: {
        create: async (args) => {
          capturedMatchEventCreate = args;
          return { id: 'event-1' };
        }
      }
    }),
    club: {
      findUnique: async () => ({ id: 'club-home', name: 'Porto Azul FC' }),
      upsert: async () => ({ id: 'club-away', name: 'Real Aurora' })
    },
    match: {},
    matchTurn: {},
    matchEvent: {}
  });

  const repository = new PrismaMatchRepository();
  await repository.createMatchForPlayer({
    telegramId: '77',
    homeClubId: 'club-home',
    homeClubName: 'Porto Azul FC',
    awayClubName: 'Real Aurora',
    playerId: 'player-1',
    userRole: 'USER_PLAYER',
    lineups: [
      {
        id: 'lineup-1',
        side: MatchPossessionSide.Home,
        role: 'FORWARD',
        displayName: 'Jogador Usuário',
        shirtNumber: 10,
        isUserControlled: true,
        tacticalPosition: 'ST'
      },
      {
        id: 'lineup-2',
        side: MatchPossessionSide.Away,
        role: 'DEFENDER',
        displayName: 'CPU',
        shirtNumber: 4,
        isUserControlled: false,
        tacticalPosition: 'CB'
      }
    ],
    initialTurn: {
      sequence: 1,
      minute: 1,
      half: MatchHalf.First,
      possessionSide: MatchPossessionSide.Home,
      contextType: MatchContextType.ReceivedFree,
      contextText: 'Primeiro lance',
      availableActions: [MatchActionKey.Pass],
      deadlineAt: new Date('2026-03-22T12:00:00.000Z'),
      previousOutcome: undefined,
      isGoalkeeperContext: false,
      visualEvent: { kind: 'duel' }
    }
  });

  assert.deepEqual(capturedMatchCreate.data.player, { connect: { id: 'player-1' } });
  assert.deepEqual(capturedMatchCreate.data.homeClub, { connect: { id: 'club-home' } });
  assert.deepEqual(capturedMatchCreate.data.awayClub, { connect: { id: 'club-away' } });
  assert.deepEqual(capturedMatchCreate.data.lineups.create[0].player, { connect: { id: 'player-1' } });
  assert.equal(capturedMatchCreate.data.lineups.create[1].player, undefined);
  assert.equal(capturedMatchTurnCreate.data.matchId, 'match-1');
  assert.equal(capturedMatchTurnCreate.data.sequence, 1);
  assert.deepEqual(capturedMatchEventCreate.data.match, { connect: { id: 'match-1' } });
  assert.deepEqual(capturedMatchEventCreate.data.turn, { connect: { id: 'turn-1' } });

  setPrismaClientForTests(null);
});

test('repositório Prisma usa connect explícito ao criar próximo turno e eventos relacionais da partida', async () => {
  const calls = { matchTurn: [], matchEvent: [], disciplinary: [], injury: [], suspension: [] };
  const originalConsoleInfo = console.info;
  const messages = [];
  console.info = (...args) => {
    messages.push(args);
  };

  setPrismaClientForTests({
    $transaction: async (callback) => callback({
      match: {
        findUnique: async (args) => {
          if (!args.include) {
            return { id: 'match-1', playerId: 'player-1' };
          }
          return {
            id: 'match-1',
            playerId: 'player-1',
            status: MatchStatus.InProgress,
            homeScore: 1,
            awayScore: 0,
            currentMinute: 16,
            currentHalf: MatchHalf.First,
            possessionSide: MatchPossessionSide.Home,
            stoppageMinutes: 0,
            userEnergy: 88,
            yellowCards: 1,
            redCards: 0,
            homeClub: { name: 'Porto Azul FC' },
            awayClub: { name: 'Real Aurora' },
            lineups: [],
            turns: [{
              id: 'turn-2',
              sequence: 2,
              minute: 16,
              half: MatchHalf.First,
              possessionSide: MatchPossessionSide.Home,
              contextType: MatchContextType.ReceivedFree,
              contextText: 'Novo lance',
              availableActions: [MatchActionKey.Pass],
              deadlineAt: new Date('2026-03-22T12:01:00.000Z'),
              state: MatchTurnState.Pending,
              isGoalkeeperContext: false,
              previousOutcome: 'Passe certo',
              events: [{ metadata: { visualEvent: { kind: 'duel' } } }]
            }],
            events: [],
            injuries: [],
            suspensions: []
          };
        },
        update: async () => ({})
      },
      matchTurn: {
        update: async () => ({}),
        create: async (args) => {
          calls.matchTurn.push(args);
          return { id: 'turn-2' };
        }
      },
      matchEvent: {
        create: async (args) => {
          calls.matchEvent.push(args);
          return { id: 'event-1' };
        }
      },
      matchDisciplinaryEvent: {
        create: async (args) => {
          calls.disciplinary.push(args);
          return { id: 'discipline-1' };
        }
      },
      injuryRecord: {
        updateMany: async () => ({ count: 0 }),
        create: async (args) => {
          calls.injury.push(args);
          return { id: 'injury-1' };
        }
      },
      suspensionRecord: {
        create: async (args) => {
          calls.suspension.push(args);
          return { id: 'suspension-1' };
        }
      }
    }),
    club: {},
    player: {},
    match: {},
    matchTurn: {},
    matchEvent: {},
    matchDisciplinaryEvent: {},
    injuryRecord: {},
    suspensionRecord: {}
  });

  const repository = new PrismaMatchRepository();
  try {
    await repository.resolveTurn('match-1', {
      turnId: 'turn-1',
      action: MatchActionKey.Pass,
      turnState: MatchTurnState.Resolved,
      outcomeText: 'Passe certo',
      homeScore: 1,
      awayScore: 0,
      minute: 16,
      half: MatchHalf.First,
      possessionSide: MatchPossessionSide.Home,
      status: MatchStatus.InProgress,
      energy: 88,
      stoppageMinutes: 0,
      yellowCardsDelta: 1,
      suspensionMatchesToAdd: 1,
      redCardIssued: false,
      injury: { severity: 2, matchesRemaining: 1, description: 'Pancada no tornozelo' },
      events: [
        { type: 'ACTION_RESOLVED', minute: 15, description: 'Passe certo', metadata: { chain: 1 } },
        { type: 'SUSPENSION', minute: 15, description: 'Suspenso', metadata: { chain: 2 } }
      ],
      nextTurn: {
        sequence: 2,
        minute: 16,
        half: MatchHalf.First,
        possessionSide: MatchPossessionSide.Home,
        contextType: MatchContextType.ReceivedFree,
        contextText: 'Novo lance',
        availableActions: [MatchActionKey.Pass],
        deadlineAt: new Date('2026-03-22T12:01:00.000Z'),
        isGoalkeeperContext: false,
        previousOutcome: 'Passe certo',
        visualEvent: { kind: 'duel' }
      }
    });
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.equal(calls.matchTurn[0].data.matchId, 'match-1');
  assert.deepEqual(calls.matchEvent[0].data.match, { connect: { id: 'match-1' } });
  assert.deepEqual(calls.matchEvent[0].data.turn, { connect: { id: 'turn-1' } });
  assert.deepEqual(calls.disciplinary[0].data.match, { connect: { id: 'match-1' } });
  assert.deepEqual(calls.disciplinary[0].data.player, { connect: { id: 'player-1' } });
  assert.deepEqual(calls.injury[0].data.match, { connect: { id: 'match-1' } });
  assert.deepEqual(calls.injury[0].data.player, { connect: { id: 'player-1' } });
  assert.deepEqual(calls.suspension[0].data.match, { connect: { id: 'match-1' } });
  assert.deepEqual(calls.suspension[0].data.player, { connect: { id: 'player-1' } });

  const nextTurnAuditLog = messages.find((entry) =>
    entry[0] === '[prisma-match-repository]'
    && typeof entry[1] === 'string'
    && entry[1].includes('match-turn-create-request')
    && entry[1].includes('resolve-next-turn')
  );
  assert.ok(nextTurnAuditLog);
  assert.match(nextTurnAuditLog[1], /"model":"MatchTurn"/);
  assert.match(nextTurnAuditLog[1], /"flowStep":"resolve-next-turn"/);
  assert.match(nextTurnAuditLog[1], /"matchId":"match-1"/);

  setPrismaClientForTests(null);
});
test('runtime propaga falha real de sendMessage para o processamento', async () => {
  const dispatcher = {
    dispatch: async () => ({
      text: 'Resposta pronta',
      actions: [phase1BotActions.mainMenu]
    })
  };
  const runtime = new Phase1TelegramRuntime(dispatcher, {
    sendMessage: async () => {
      throw new Error('Telegram sendMessage falhou com 403');
    },
    sendDocument: async () => {},
    sendPhoto: async () => {
      throw new Error('Telegram sendPhoto falhou com 403');
    },
    setWebhook: async () => {},
    getWebhookInfo: async () => ({}),
    deleteWebhook: async () => {}
  });

  await assert.rejects(
    runtime.processUpdate({
      update_id: 30,
      message: {
        message_id: 1,
        text: '/start',
        chat: { id: 500, type: 'private' },
        from: { id: 999 }
      }
    }),
    /sendMessage falhou com 403/
  );
});

test('servidor Railway expõe diagnóstico e não mascara erro interno como invalid-json', async () => {
  const port = 3333 + Math.floor(Math.random() * 200);
  const runtime = {
    async processUpdate() {
      throw new Error('dispatcher-runtime-broken');
    }
  };
  const telegramClient = {
    async sendMessage() {},
    async sendDocument() {},
    async sendPhoto() {},
    async setWebhook() {},
    async getWebhookInfo() { return {}; },
    async deleteWebhook() {}
  };

  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://tele',
      TELEGRAM_BOT_TOKEN: 'token-visible-only-as-boolean',
      TELEGRAM_WEBHOOK_SECRET: 'diag-secret',
      APP_BASE_URL: 'https://tele.example',
      PORT: port,
      NODE_ENV: 'test'
    },
    runtime,
    telegramClient
  });

  await server.start();

  const debugResponse = await fetch(`http://127.0.0.1:${port}/debug/telegram-runtime`);
  assert.equal(debugResponse.status, 200);
  const debugPayload = await debugResponse.json();
  assert.deepEqual(debugPayload, {
    nodeEnv: 'test',
    hasTelegramBotToken: true,
    hasAppBaseUrl: true,
    hasWebhookSecret: true,
    webhookPath: '/telegram/webhook/diag-secret'
  });

  const webhookResponse = await fetch(`http://127.0.0.1:${port}/telegram/webhook/diag-secret`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'diag-secret'
    },
    body: JSON.stringify({
      update_id: 40,
      message: {
        message_id: 8,
        chat: { id: 1, type: 'private' },
        from: { id: 2 },
        text: '/start'
      }
    })
  });

  assert.equal(webhookResponse.status, 500);
  assert.equal(await webhookResponse.text(), 'processing-error');

  await server.stop();
});

test('servidor Railway ignora update estruturalmente válido sem mensagem processável', async () => {
  const processedUpdates = [];
  const runtime = {
    async processUpdate(update) {
      processedUpdates.push(update);
      return false;
    }
  };
  const telegramClient = {
    async sendMessage() {},
    async sendDocument() {},
    async sendPhoto() {},
    async setWebhook() {},
    async getWebhookInfo() { return {}; },
    async deleteWebhook() {}
  };

  const port = 3322;
  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://tele',
      PORT: port,
      NODE_ENV: 'test',
      TELEGRAM_WEBHOOK_SECRET: 'ignored-secret'
    },
    runtime,
    telegramClient
  });

  await server.start();

  const ignoredResponse = await fetch(`http://127.0.0.1:${port}/telegram/webhook/ignored-secret`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'ignored-secret'
    },
    body: JSON.stringify({ update_id: 99 })
  });

  assert.equal(ignoredResponse.status, 202);
  assert.equal(processedUpdates.length, 1);

  await server.stop();
});
