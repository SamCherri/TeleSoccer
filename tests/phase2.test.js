const test = require('node:test');
const assert = require('node:assert/strict');

const { CreatePlayerService, TryoutService } = require('../dist/domain/player/services.js');
const { StartMatchService, GetActiveMatchService, ResolveMatchTurnService } = require('../dist/domain/match/services.js');
const { MatchEngine } = require('../dist/domain/match/engine.js');
const { DominantFoot, PlayerPosition, CareerStatus, AttributeKey } = require('../dist/domain/shared/enums.js');
const { MatchStatus, MatchRole } = require('../dist/domain/match/types.js');
const { DomainError } = require('../dist/shared/errors.js');

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

  async applyTraining() { throw new Error('not used'); }
  async getCareerStatusByTelegramId() { throw new Error('not used'); }
  async getCareerHistoryByTelegramId() { throw new Error('not used'); }
  async getWalletStatementByTelegramId() { throw new Error('not used'); }

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
    const match = this.matchesByTelegramId.get(telegramId);
    return match && match.status === MatchStatus.InProgress ? structuredClone(match) : null;
  }

  async createMatchForPlayer(params) {
    const match = {
      id: `match-${params.playerId}`,
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
        matchId: `match-${params.playerId}`,
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
        previousOutcome: params.initialTurn.previousOutcome
      },
      recentEvents: [{ type: 'TURN_STARTED', minute: params.initialTurn.minute, description: 'Partida iniciada e primeiro lance liberado.', createdAt: new Date() }],
      yellowCards: 0,
      redCards: 0,
      suspensionMatchesRemaining: 0,
      energy: 100
    };
    this.matchesByTelegramId.set(params.telegramId, match);
    return structuredClone(match);
  }

  async resolveTurn(matchId, resolution) {
    const [telegramId, match] = [...this.matchesByTelegramId.entries()].find(([, value]) => value.id === matchId);
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
      match.suspensionMatchesRemaining += resolution.suspensionMatchesToAdd;
      this.suspensions.set(match.playerId, (this.suspensions.get(match.playerId) || 0) + resolution.suspensionMatchesToAdd);
    }
    if (resolution.injury) {
      match.injury = { ...resolution.injury };
    }
    match.recentEvents = [
      ...resolution.events.map((event) => ({ ...event, createdAt: new Date() })),
      ...match.recentEvents
    ].slice(0, 8);
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
          previousOutcome: resolution.nextTurn.previousOutcome
        }
      : undefined;

    this.matchesByTelegramId.set(telegramId, match);
    return { match: structuredClone(match), resolutionText: resolution.outcomeText };
  }

  async consumePendingSuspension(playerId) {
    const pending = this.suspensions.get(playerId) || 0;
    if (pending <= 0) return false;
    this.suspensions.set(playerId, pending - 1);
    return true;
  }
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
  const startMatchService = new StartMatchService(matchRepo, new MatchEngine());

  const result = await startMatchService.execute('301', new Date('2026-03-03T12:00:00.000Z'));

  assert.equal(result.match.status, MatchStatus.InProgress);
  assert.equal(result.match.scoreboard.homeScore, 0);
  assert.ok(result.match.activeTurn);
  assert.ok(result.match.activeTurn.availableActions.length >= 3);
});

test('resolve lance, atualiza placar/eventos e encerra a partida ao fim dos turnos', async () => {
  const playerRepo = await createProfessionalPlayer('302');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const getActiveMatchService = new GetActiveMatchService(matchRepo);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepo, engine);

  await startMatchService.execute('302', new Date('2026-03-03T12:00:00.000Z'));

  let match = await getActiveMatchService.execute('302');
  let safety = 0;
  while (match.status === MatchStatus.InProgress && safety < 20) {
    const action = match.activeTurn.availableActions[0].key;
    const result = await resolveMatchTurnService.execute('302', action, new Date(match.activeTurn.deadlineAt.getTime() - 1000));
    match = result.match;
    safety += 1;
  }

  assert.equal(match.status, MatchStatus.Finished);
  assert.ok(match.scoreboard.minute >= 90);
  assert.ok(match.recentEvents.some((event) => event.type === 'MATCH_FINISHED'));
});

test('aplica timeout ao perder o prazo do turno', async () => {
  const playerRepo = await createProfessionalPlayer('303');
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const engine = new MatchEngine();
  const startMatchService = new StartMatchService(matchRepo, engine);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepo, engine);

  const started = await startMatchService.execute('303', new Date('2026-03-03T12:00:00.000Z'));
  const expiredAt = new Date(started.match.activeTurn.deadlineAt.getTime() + 1000);
  const resolved = await resolveMatchTurnService.execute('303', undefined, expiredAt);

  assert.ok(resolved.resolutionText.includes('não respondeu'));
  assert.ok(resolved.match.recentEvents.some((event) => event.type === 'TIMEOUT'));
});

test('bloqueia nova partida quando há suspensão pendente a cumprir', async () => {
  const playerRepo = await createProfessionalPlayer('304', PlayerPosition.Defender);
  const matchRepo = new InMemoryMatchRepository(playerRepo);
  const startMatchService = new StartMatchService(matchRepo, new MatchEngine());

  matchRepo.suspensions.set('player-304', 1);

  await assert.rejects(() => startMatchService.execute('304'), (error) => {
    assert.ok(error instanceof DomainError);
    assert.ok(error.message.includes('suspenso'));
    return true;
  });
});
