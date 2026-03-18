const test = require('node:test');
const assert = require('node:assert/strict');

const { CreatePlayerService, GetPlayerCardService, TryoutService, WeeklyTrainingService, phase1Economy } = require('../dist/domain/player/services.js');
const { AttributeKey, CareerStatus, DominantFoot, PlayerPosition, TryoutStatus } = require('../dist/domain/shared/enums.js');
const { PrismaPlayerRepository, buildTrainingSessionCreateData } = require('../dist/infra/prisma/player-repository.js');
const { setPrismaClientForTests } = require('../dist/infra/prisma/client.js');

class InMemoryPlayerRepository {
  constructor() {
    this.playersByTelegramId = new Map();
    this.trainingWeeks = new Set();
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
    return player;
  }

  async findByTelegramId(telegramId) {
    return this.playersByTelegramId.get(telegramId) ?? null;
  }

  async applyTraining(params) {
    const player = [...this.playersByTelegramId.values()].find((entry) => entry.id === params.playerId);
    const weekKey = `${params.playerId}:${params.weekNumber}`;
    if (this.trainingWeeks.has(weekKey)) {
      throw new Error('O treino desta semana já foi utilizado.');
    }
    this.trainingWeeks.add(weekKey);
    player.walletBalance -= params.cost;
    player.attributes[params.focus] += params.attributeGain;
    player.trainingHistoryCount += 1;
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
    if (params.approvedClubId && params.approvedClubName) {
      player.careerStatus = CareerStatus.Professional;
      player.currentClubId = params.approvedClubId;
      player.currentClubName = params.approvedClubName;
    }
    return {
      playerId: player.id,
      status: params.approvedClubId ? TryoutStatus.Approved : TryoutStatus.Failed,
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
    clubMembership: {}
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
