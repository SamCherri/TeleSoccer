const test = require('node:test');
const assert = require('node:assert/strict');

const { CreatePlayerService, TryoutService, WeeklyTrainingService, GetPlayerCardService } = require('../dist/domain/player/services.js');
const { StartMatchService, GetActiveMatchService, ResolveMatchTurnService } = require('../dist/domain/match/services.js');
const { MatchEngine } = require('../dist/domain/match/engine.js');
const { DominantFoot, PlayerPosition, CareerStatus } = require('../dist/domain/shared/enums.js');
const { MatchStatus, MatchHalf, MatchPossessionSide, MatchContextType, MatchActionKey } = require('../dist/domain/match/types.js');
const { Phase1TelegramFacade, phase1BotActions } = require('../dist/bot/phase1-bot.js');
const { DomainError } = require('../dist/shared/errors.js');

const SPECIAL_CONTEXTS = new Set([MatchContextType.FreeKick, MatchContextType.PenaltyKick, MatchContextType.CornerKick]);

class InMemoryPlayerRepository {
  constructor() {
    this.playersByTelegramId = new Map();
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
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      attributes: { ...input.attributes, PASSING: 50, SHOOTING: 50, DRIBBLING: 50, SPEED: 50, MARKING: 45, POSITIONING: 48, REFLEXES: 46, HANDLING: 46, KICKING: 46 },
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

  async getCareerStatusByTelegramId() {
    throw new Error('not used');
  }
  async getCareerHistoryByTelegramId() {
    throw new Error('not used');
  }
  async getWalletStatementByTelegramId() {
    throw new Error('not used');
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
      status: params.approvedClubId ? 'APPROVED' : 'FAILED',
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

class InMemoryMatchRepository {
  constructor(playerRepo) {
    this.playerRepo = playerRepo;
    this.matchesByTelegramId = new Map();
    this.suspensions = new Map();
  }

  async findPlayerByTelegramId(telegramId) {
    const player = await this.playerRepo.findByTelegramId(telegramId);
    if (!player) return null;
    return {
      playerId: player.id,
      telegramId,
      playerName: player.name,
      clubId: player.currentClubId,
      clubName: player.currentClubName,
      position: player.position,
      careerStatus: player.careerStatus,
      attributes: player.attributes
    };
  }

  async getActiveMatchByTelegramId(telegramId) {
    const state = this.matchesByTelegramId.get(telegramId);
    return state?.active ? structuredClone(state.active) : null;
  }

  async getLatestMatchByTelegramId(telegramId) {
    const state = this.matchesByTelegramId.get(telegramId);
    return state?.active ? structuredClone(state.active) : state?.latest ? structuredClone(state.latest) : null;
  }

  async createMatchForPlayer(params) {
    const matchId = `match-${params.playerId}-${Date.now()}`;
    const match = {
      id: matchId,
      playerId: params.playerId,
      status: MatchStatus.InProgress,
      scoreboard: {
        homeClubName: params.homeClubName,
        awayClubName: params.awayClubName,
        homeScore: 0,
        awayScore: 0,
        minute: params.initialTurn.minute,
        half: params.initialTurn.half,
        status: MatchStatus.InProgress,
        stoppageMinutes: 0
      },
      activeTurn: {
        id: `turn-${params.initialTurn.sequence}`,
        matchId,
        sequence: params.initialTurn.sequence,
        minute: params.initialTurn.minute,
        half: params.initialTurn.half,
        possessionSide: params.initialTurn.possessionSide,
        contextType: params.initialTurn.contextType,
        contextText: params.initialTurn.contextText,
        availableActions: params.initialTurn.availableActions.map((key) => ({ key, label: key })),
        deadlineAt: params.initialTurn.deadlineAt,
        state: 'PENDING',
        isGoalkeeperContext: params.initialTurn.isGoalkeeperContext,
        previousOutcome: params.initialTurn.previousOutcome,
        visualEvent: params.initialTurn.visualEvent
      },
      recentEvents: [{ type: 'TURN_STARTED', minute: params.initialTurn.minute, description: 'Partida iniciada e primeiro lance liberado.', createdAt: new Date() }],
      lineups: structuredClone(params.lineups),
      yellowCards: 0,
      redCards: 0,
      suspensionMatchesRemaining: 0,
      energy: 100
    };
    this.matchesByTelegramId.set(params.telegramId, { active: match, latest: match });
    return structuredClone(match);
  }

  async resolveTurn(matchId, resolution) {
    const [telegramId, state] = [...this.matchesByTelegramId.entries()].find(([, value]) => (value.active ?? value.latest)?.id === matchId);
    const match = state.active ?? state.latest;
    match.scoreboard.homeScore = resolution.homeScore;
    match.scoreboard.awayScore = resolution.awayScore;
    match.scoreboard.minute = resolution.minute;
    match.scoreboard.half = resolution.half;
    match.scoreboard.status = resolution.status;
    match.scoreboard.stoppageMinutes = resolution.stoppageMinutes;
    match.status = resolution.status;
    match.energy = resolution.energy;
    match.yellowCards += resolution.yellowCardsDelta || 0;
    match.redCards += resolution.redCardIssued ? 1 : 0;
    if (resolution.suspensionMatchesToAdd) {
      const pending = (this.suspensions.get(match.playerId) || 0) + resolution.suspensionMatchesToAdd;
      this.suspensions.set(match.playerId, pending);
      match.suspensionMatchesRemaining = pending;
    } else {
      match.suspensionMatchesRemaining = this.suspensions.get(match.playerId) || 0;
    }
    if (resolution.injury) {
      match.injury = { ...resolution.injury };
    }
    match.recentEvents = [...resolution.events.map((event) => ({ ...event, createdAt: new Date() })), ...match.recentEvents].slice(0, 8);
    match.activeTurn = resolution.nextTurn
      ? {
          id: `turn-${resolution.nextTurn.sequence}`,
          matchId,
          sequence: resolution.nextTurn.sequence,
          minute: resolution.nextTurn.minute,
          half: resolution.nextTurn.half,
          possessionSide: resolution.nextTurn.possessionSide,
          contextType: resolution.nextTurn.contextType,
          contextText: resolution.nextTurn.contextText,
          availableActions: resolution.nextTurn.availableActions.map((key) => ({ key, label: key })),
          deadlineAt: resolution.nextTurn.deadlineAt,
          state: 'PENDING',
          isGoalkeeperContext: resolution.nextTurn.isGoalkeeperContext,
          previousOutcome: resolution.nextTurn.previousOutcome,
          visualEvent: resolution.nextTurn.visualEvent
        }
      : undefined;

    if (resolution.status === MatchStatus.Finished) {
      this.matchesByTelegramId.set(telegramId, { active: null, latest: match });
    } else {
      this.matchesByTelegramId.set(telegramId, { active: match, latest: match });
    }

    return { match: structuredClone(match), resolutionText: resolution.outcomeText };
  }

  async consumePendingSuspension(playerId) {
    const pending = this.suspensions.get(playerId) || 0;
    if (pending <= 0) return false;
    this.suspensions.set(playerId, pending - 1);
    return true;
  }
}

class StaticMatchRepository {
  constructor(activeMatch, latestMatch) {
    this.activeMatch = activeMatch;
    this.latestMatch = latestMatch;
  }
  async findPlayerByTelegramId() {
    return null;
  }
  async getActiveMatchByTelegramId() {
    return this.activeMatch;
  }
  async getLatestMatchByTelegramId() {
    return this.latestMatch;
  }
  async createMatchForPlayer() {
    throw new Error('not used');
  }
  async resolveTurn() {
    throw new Error('not used');
  }
  async consumePendingSuspension() {
    return false;
  }
}

function createSearchPlayer(position = PlayerPosition.Defender) {
  return {
    playerId: 'player-search',
    telegramId: 'search',
    playerName: 'Tester',
    clubId: 'club-1',
    clubName: 'Porto Azul FC',
    position,
    careerStatus: CareerStatus.Professional,
    attributes: { PASSING: 50, SHOOTING: 50, DRIBBLING: 50, SPEED: 50, MARKING: 45, POSITIONING: 48, REFLEXES: 46, HANDLING: 46, KICKING: 46 }
  };
}

function findMatchIdFor({ sequence, contextType, action, predicate, position = PlayerPosition.Defender, possessionSide = MatchPossessionSide.Home }) {
  for (let index = 1; index < 5000; index += 1) {
    const matchId = `match-search-${index}`;
    const resolution = new MatchEngine().resolve({
      matchId,
      player: createSearchPlayer(position),
      turn: {
        id: 'turn-search',
        sequence,
        minute: 60,
        half: MatchHalf.Second,
        possessionSide,
        contextType,
        deadlineAt: new Date('2026-03-03T12:00:30.000Z'),
        homeScore: 0,
        awayScore: 0,
        energy: 70,
        stoppageMinutes: 0,
        currentYellowCards: 0
      },
      action,
      now: new Date('2026-03-03T12:00:00.000Z')
    });

    if (predicate(resolution)) {
      return { matchId, resolution };
    }
  }

  throw new Error('unable to find deterministic match id for requested predicate');
}

async function createProfessionalPlayer(telegramId, position = PlayerPosition.Forward) {
  const playerRepo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(playerRepo);
  await createPlayerService.execute({
    telegramId,
    name: 'Rafael Lima',
    nationality: 'Brasil',
    position,
    dominantFoot: DominantFoot.Right,
    heightCm: 178,
    weightKg: 72,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });
  const tryoutService = new TryoutService(playerRepo, new InMemoryClubRepository());
  await tryoutService.execute(telegramId, new Date('2026-03-02T00:00:00.000Z'));
  return playerRepo;
}

test('inicia partida profissional e devolve o primeiro lance pendente', async () => {
  const playerRepo = await createProfessionalPlayer('301');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);

  const result = await startMatchService.execute('301', new Date('2026-03-03T12:00:00.000Z'));

  assert.equal(result.match.status, MatchStatus.InProgress);
  assert.equal(result.match.scoreboard.homeScore, 0);
  assert.ok(result.match.activeTurn);
  assert.equal(result.match.scoreboard.minute, result.match.activeTurn.minute);
  assert.ok(result.match.activeTurn.availableActions.length >= 3);
});

test('GetActiveMatchService prioriza partida em andamento quando ela existe', async () => {
  const activeMatch = { id: 'active-1', status: MatchStatus.InProgress, activeTurn: { id: 'turn-1', deadlineAt: new Date('2026-03-03T12:00:30.000Z') } };
  const latestMatch = { id: 'finished-1', status: MatchStatus.Finished, activeTurn: undefined };
  const service = new GetActiveMatchService(new StaticMatchRepository(activeMatch, latestMatch), new MatchEngine());

  const result = await service.execute('telegram-1', new Date('2026-03-03T12:00:00.000Z'));
  assert.equal(result.id, 'active-1');
});

test('GetActiveMatchService retorna a última finalizada quando não há partida em andamento', async () => {
  const latestMatch = { id: 'finished-1', status: MatchStatus.Finished, activeTurn: undefined };
  const service = new GetActiveMatchService(new StaticMatchRepository(null, latestMatch), new MatchEngine());

  const result = await service.execute('telegram-1');
  assert.equal(result.id, 'finished-1');
  assert.equal(result.activeTurn, undefined);
});

test('GetActiveMatchService.executeOptional retorna null quando não há partida disponível', async () => {
  const service = new GetActiveMatchService(new StaticMatchRepository(null, null), new MatchEngine());

  const result = await service.executeOptional('telegram-1');
  assert.equal(result, null);
});

test('consulta resolve timeout expirado automaticamente antes de retornar a partida', async () => {
  const playerRepo = await createProfessionalPlayer('307');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const getActiveMatchService = new GetActiveMatchService(matchRepo, engine);

  const started = await startMatchService.execute('307', new Date('2026-03-03T12:00:00.000Z'));
  const expiredNow = new Date(started.match.activeTurn.deadlineAt.getTime() + 1000);
  const match = await getActiveMatchService.execute('307', expiredNow);

  assert.equal(match.status, MatchStatus.InProgress);
  assert.ok(match.activeTurn);
  assert.equal(match.activeTurn.sequence, started.match.activeTurn.sequence + 1);
  assert.equal(match.activeTurn.possessionSide, MatchPossessionSide.Away);
  assert.ok(match.recentEvents.some((event) => event.type === 'TIMEOUT'));
  assert.equal(match.activeTurn.contextType === MatchContextType.PenaltyKick, false);
});

test('tentativa de resolver turno expirado processa timeout corretamente', async () => {
  const playerRepo = await createProfessionalPlayer('303');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepo, engine);

  const started = await startMatchService.execute('303', new Date('2026-03-03T12:00:00.000Z'));
  const expiredAt = new Date(started.match.activeTurn.deadlineAt.getTime() + 1000);
  const resolved = await resolveMatchTurnService.execute('303', started.match.activeTurn.availableActions[0].key, expiredAt);

  assert.ok(resolved.resolutionText.includes('não respondeu'));
  assert.ok(resolved.match.recentEvents.some((event) => event.type === 'TIMEOUT'));
  assert.equal(resolved.match.activeTurn.possessionSide, MatchPossessionSide.Away);
});

test('resolve lance, atualiza placar/eventos e encerra a partida ao fim dos turnos', async () => {
  const playerRepo = await createProfessionalPlayer('302');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const getActiveMatchService = new GetActiveMatchService(matchRepo, engine);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepo, engine);

  await startMatchService.execute('302', new Date('2026-03-03T12:00:00.000Z'));

  let match = await getActiveMatchService.execute('302', new Date('2026-03-03T12:00:00.000Z'));
  let safety = 0;
  while (match.status === MatchStatus.InProgress && safety < 20) {
    const action = match.activeTurn.availableActions[0].key;
    const result = await resolveMatchTurnService.execute('302', action, new Date(match.activeTurn.deadlineAt.getTime() - 1000));
    match = result.match;
    safety += 1;
  }

  assert.equal(match.status, MatchStatus.Finished);
  assert.ok(match.scoreboard.minute >= 90);
  assert.equal(match.activeTurn, undefined);
  assert.ok(match.recentEvents.some((event) => event.type === 'MATCH_FINISHED'));
});

test('falta perigosa gera FREE_KICK como próximo contexto', () => {
  const { resolution } = findMatchIdFor({
    sequence: 5,
    contextType: MatchContextType.ReceivedPressed,
    action: MatchActionKey.Pass,
    predicate: (candidate) => candidate.events.some((event) => event.type === 'FOUL') && candidate.nextTurn?.contextType === MatchContextType.FreeKick
  });

  assert.ok(resolution.events.some((event) => event.type === 'FOUL'));
  assert.equal(resolution.nextTurn.contextType, MatchContextType.FreeKick);
});

test('pênalti marcado gera PENALTY_KICK como próximo contexto', () => {
  const { resolution } = findMatchIdFor({
    sequence: 5,
    contextType: MatchContextType.InBox,
    action: MatchActionKey.Shoot,
    predicate: (candidate) => candidate.events.some((event) => event.type === 'PENALTY_AWARDED') && candidate.nextTurn?.contextType === MatchContextType.PenaltyKick
  });

  assert.ok(resolution.events.some((event) => event.type === 'PENALTY_AWARDED'));
  assert.equal(resolution.nextTurn.contextType, MatchContextType.PenaltyKick);
});

test('escanteio concedido gera CORNER_KICK como próximo contexto', () => {
  const { resolution } = findMatchIdFor({
    sequence: 6,
    contextType: MatchContextType.ReceivedFree,
    action: MatchActionKey.Shoot,
    predicate: (candidate) => candidate.events.some((event) => event.type === 'CORNER_AWARDED') && candidate.nextTurn?.contextType === MatchContextType.CornerKick
  });

  assert.ok(resolution.events.some((event) => event.type === 'CORNER_AWARDED'));
  assert.equal(resolution.nextTurn.contextType, MatchContextType.CornerKick);
});

test('contextos especiais não surgem aleatoriamente sem causa anterior coerente', () => {
  const engine = new MatchEngine();
  const linePlayer = createSearchPlayer(PlayerPosition.Forward);
  const goalkeeper = createSearchPlayer(PlayerPosition.Goalkeeper);

  for (let sequence = 1; sequence <= 14; sequence += 1) {
    const outfieldTurn = engine.createTurn(linePlayer, sequence, { now: new Date('2026-03-03T12:00:00.000Z') });
    const goalkeeperTurn = engine.createTurn(goalkeeper, sequence, { now: new Date('2026-03-03T12:00:00.000Z') });

    assert.equal(SPECIAL_CONTEXTS.has(outfieldTurn.contextType), false);
    assert.equal(SPECIAL_CONTEXTS.has(goalkeeperTurn.contextType), false);
  }
});

test('duelo defensivo não gera falta automaticamente e evita duplicidade de FOUL', () => {
  const semFalta = findMatchIdFor({
    sequence: 8,
    contextType: MatchContextType.DefensiveDuel,
    action: MatchActionKey.Tackle,
    predicate: (resolution) => resolution.events.filter((event) => event.type === 'FOUL').length === 0
  }).resolution;

  const comFalta = findMatchIdFor({
    sequence: 8,
    contextType: MatchContextType.DefensiveDuel,
    action: MatchActionKey.Tackle,
    predicate: (resolution) => resolution.events.filter((event) => event.type === 'FOUL').length === 1
  }).resolution;

  assert.equal(semFalta.events.filter((event) => event.type === 'FOUL').length, 0);
  assert.equal(comFalta.events.filter((event) => event.type === 'FOUL').length, 1);
});

test('cartão vermelho é raro e não encerra a partida automaticamente', () => {
  const { resolution } = findMatchIdFor({
    sequence: 8,
    contextType: MatchContextType.DefensiveDuel,
    action: MatchActionKey.Tackle,
    predicate: (candidate) => candidate.redCardIssued === true
  });

  assert.equal(resolution.redCardIssued, true);
  assert.equal(resolution.status, MatchStatus.InProgress);
  assert.ok(resolution.nextTurn);
  assert.ok(resolution.events.some((event) => event.type === 'RED_CARD'));
  assert.ok(resolution.events.some((event) => event.type === 'SUSPENSION'));
});

test('cartão amarelo é mais comum que vermelho no duelo defensivo', () => {
  const amarelo = findMatchIdFor({
    sequence: 8,
    contextType: MatchContextType.DefensiveDuel,
    action: MatchActionKey.Tackle,
    predicate: (candidate) => candidate.yellowCardsDelta === 1
  }).resolution;

  const vermelho = findMatchIdFor({
    sequence: 8,
    contextType: MatchContextType.DefensiveDuel,
    action: MatchActionKey.Tackle,
    predicate: (candidate) => candidate.redCardIssued === true
  }).resolution;

  assert.equal(amarelo.yellowCardsDelta, 1);
  assert.equal(vermelho.redCardIssued, true);
  assert.ok(amarelo.events.some((event) => event.type === 'YELLOW_CARD'));
});

test('consulta partida finalizada quando não há mais partida em andamento e não expõe activeTurn', async () => {
  const playerRepo = await createProfessionalPlayer('304');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const getActiveMatchService = new GetActiveMatchService(matchRepo, engine);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepo, engine);

  await startMatchService.execute('304', new Date('2026-03-03T12:00:00.000Z'));

  let match = await getActiveMatchService.execute('304', new Date('2026-03-03T12:00:00.000Z'));
  let safety = 0;
  while (match.status === MatchStatus.InProgress && safety < 20) {
    const action = match.activeTurn.availableActions[0].key;
    match = (await resolveMatchTurnService.execute('304', action, new Date(match.activeTurn.deadlineAt.getTime() - 1000))).match;
    safety += 1;
  }

  const lastMatch = await getActiveMatchService.execute('304', new Date('2026-03-03T13:00:00.000Z'));
  assert.equal(lastMatch.status, MatchStatus.Finished);
  assert.equal(lastMatch.activeTurn, undefined);
});

test('menu de treino preserva a ação cancelar', async () => {
  const playerRepo = new InMemoryPlayerRepository();
  const createPlayerService = new CreatePlayerService(playerRepo);
  const getPlayerCardService = new GetPlayerCardService(playerRepo);
  const weeklyTrainingService = new WeeklyTrainingService(playerRepo);

  await createPlayerService.execute({
    telegramId: '306',
    name: 'Caio Melo',
    nationality: 'Brasil',
    position: PlayerPosition.Midfielder,
    dominantFoot: DominantFoot.Right,
    heightCm: 176,
    weightKg: 70,
    visual: { skinTone: 'morena', hairStyle: 'curto' }
  });

  const facade = new Phase1TelegramFacade(
    createPlayerService,
    getPlayerCardService,
    { execute: async () => { throw new Error('not used'); } },
    { execute: async () => { throw new Error('not used'); } },
    { execute: async () => { throw new Error('not used'); } },
    weeklyTrainingService,
    { execute: async () => { throw new Error('not used'); } }
  );

  const reply = await facade.handleTrainingMenu('306');
  assert.ok(reply.actions.includes(phase1BotActions.cancel));
});

test('bloqueia nova partida quando há suspensão pendente a cumprir', async () => {
  const playerRepo = await createProfessionalPlayer('305', PlayerPosition.Defender);
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const startMatchService = new StartMatchService(matchRepo, new MatchEngine());

  matchRepo.suspensions.set('player-305', 1);

  await assert.rejects(() => startMatchService.execute('305'), (error) => {
    assert.ok(error instanceof DomainError);
    assert.ok(error.message.includes('suspenso'));
    return true;
  });
});


test('fachada da partida expõe cena visual simples com svg e fallback textual', async () => {
  const repo = new InMemoryPlayerRepository();
  const clubs = new InMemoryClubRepository();
  const createPlayerService = new CreatePlayerService(repo);

  await createPlayerService.execute({
    telegramId: 'scene-1',
    name: 'Leo Cena',
    nationality: 'Brasil',
    position: PlayerPosition.Forward,
    dominantFoot: DominantFoot.Right,
    heightCm: 180,
    weightKg: 74,
    visual: { skinTone: 'clara', hairStyle: 'curto' }
  });

  const player = await repo.findByTelegramId('scene-1');
  player.careerStatus = CareerStatus.Professional;
  player.currentClubId = 'club-1';
  player.currentClubName = 'Porto Azul FC';

  const matchRepository = new InMemoryMatchRepository(repo);
  const matchEngine = new MatchEngine();
  const facade = new Phase1TelegramFacade(
    createPlayerService,
    new GetPlayerCardService(repo),
    { execute: async (telegramId) => ({
      playerName: (await repo.findByTelegramId(telegramId)).name,
      careerStatus: CareerStatus.Professional,
      currentClubName: 'Porto Azul FC',
      walletBalance: 100,
      currentWeekNumber: 1,
      trainingAvailableThisWeek: true,
      totalTrainings: 0,
      totalTryouts: 0,
      latestTryout: null,
      recentHistory: []
    }) },
    { execute: async () => ({ playerName: 'Leo Cena', careerStatus: CareerStatus.Professional, currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Leo Cena', careerStatus: CareerStatus.Professional, walletBalance: 100, transactionCount: 0, recentTransactions: [] }) },
    new WeeklyTrainingService(repo),
    new TryoutService(repo, clubs),
    new StartMatchService(matchRepository, matchEngine),
    new GetActiveMatchService(matchRepository, matchEngine),
    new ResolveMatchTurnService(matchRepository, matchEngine)
  );

  const reply = await facade.handleStartMatch('scene-1');

  assert.ok(reply.scene);
  assert.match(reply.scene.svg, /<svg/);
  assert.match(reply.text, /CENA DO LANCE/);
  assert.match(reply.scene.fallbackText, /Arte preparada/);
});
