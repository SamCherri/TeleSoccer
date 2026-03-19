const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CreateMultiplayerSessionService,
  GetMultiplayerSessionService,
  JoinMultiplayerSessionService,
  PrepareMultiplayerSessionService
} = require('../dist/domain/multiplayer/services.js');
const {
  MultiplayerTeamSide,
  MultiplayerSquadRole,
  MultiplayerParticipantKind,
  MultiplayerSessionFillPolicy,
  MultiplayerSessionStatus
} = require('../dist/domain/multiplayer/types.js');
const { GameCardRenderer } = require('../dist/presentation/game-card-renderer.js');
const {
  buildMultiplayerSessionCardViewModel,
  buildMultiplayerSquadCardViewModel,
  buildMultiplayerPreparationCardViewModel,
  buildMatchCardViewModel
} = require('../dist/view-models/game-view-models.js');
const { Phase1TelegramFacade } = require('../dist/bot/phase1-bot.js');
const { MatchStatus, MatchHalf, MatchPossessionSide, MatchContextType, MatchActionKey } = require('../dist/domain/match/types.js');
const { DomainError } = require('../dist/shared/errors.js');

class InMemoryMultiplayerRepository {
  constructor() {
    this.players = new Map();
    this.sessions = new Map();
    this.participants = new Map();
    this.codeIndex = new Map();
    this.sequence = 0;
  }

  registerPlayer({ telegramId, userId, playerId, playerName }) {
    this.players.set(telegramId, { telegramId, userId, playerId, playerName });
  }

  async findPlayerProfileByTelegramId(telegramId) {
    return this.players.get(telegramId) ?? null;
  }

  async createSession(input) {
    const id = `session-${++this.sequence}`;
    const code = `CODE${this.sequence}`;
    const session = {
      id,
      code,
      hostUserId: input.hostUserId,
      fillPolicy: input.fillPolicy,
      maxStartersPerSide: input.maxStartersPerSide,
      maxSubstitutesPerSide: input.maxSubstitutesPerSide,
      botFallbackEligibleSlots: input.botFallbackEligibleSlots,
      minimumHumansToStart: input.minimumHumansToStart,
      linkedMatchId: undefined,
      status: MultiplayerSessionStatus.WaitingForPlayers,
      createdAt: new Date('2026-03-19T12:00:00.000Z'),
      updatedAt: new Date('2026-03-19T12:00:00.000Z'),
      participants: []
    };
    const host = {
      id: `participant-${this.sequence}-1`,
      sessionId: id,
      side: input.preferredSide,
      slotNumber: 1,
      squadRole: input.preferredRole,
      kind: MultiplayerParticipantKind.Human,
      userId: input.hostUserId,
      playerId: input.hostPlayerId,
      playerName: input.hostPlayerName,
      isHost: true,
      isCaptain: input.preferredRole === MultiplayerSquadRole.Starter,
      joinedAt: new Date('2026-03-19T12:00:00.000Z')
    };
    session.participants.push(host);
    this.sessions.set(id, session);
    this.codeIndex.set(code, id);
    return this._summarize(session);
  }

  async getSessionByCode(sessionCode) {
    const id = this.codeIndex.get(sessionCode);
    return id ? this._summarize(this.sessions.get(id)) : null;
  }

  async getCurrentSessionForTelegramUser(telegramId) {
    const profile = this.players.get(telegramId);
    if (!profile) return null;
    for (const session of this.sessions.values()) {
      if (session.participants.some((participant) => participant.userId === profile.userId)) {
        return this._summarize(session);
      }
    }
    return null;
  }

  async joinSession(input) {
    const id = this.codeIndex.get(input.sessionCode);
    const session = this.sessions.get(id);
    if (!session) throw new DomainError('Sessão não encontrada');

    const existing = session.participants.find((participant) => participant.userId === input.userId);
    if (existing) {
      return { session: this._summarize(session), participant: existing };
    }

    const participant = this._allocate(session, input);
    session.participants.push(participant);
    session.updatedAt = new Date('2026-03-19T12:30:00.000Z');
    session.status = this._summarize(session).canPrepareMatch ? MultiplayerSessionStatus.ReadyToPrepare : MultiplayerSessionStatus.ReadyForFallback;
    return { session: this._summarize(session), participant };
  }

  async addBotFallbackParticipants(input) {
    const session = this.sessions.get(input.sessionId);
    for (const bot of input.bots) {
      session.participants.push({
        id: `bot-${session.participants.length + 1}`,
        sessionId: session.id,
        side: bot.side,
        slotNumber: bot.slotNumber,
        squadRole: bot.squadRole,
        kind: MultiplayerParticipantKind.Bot,
        playerName: bot.playerName,
        isHost: false,
        isCaptain: false,
        joinedAt: new Date('2026-03-19T12:45:00.000Z')
      });
    }
    return this._summarize(session);
  }

  async updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    session.status = status;
    return this._summarize(session);
  }

  async findParticipantByUser(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    return session.participants.find((participant) => participant.userId === userId) ?? null;
  }

  _allocate(session, input) {
    const sides = input.preferredSide ? [input.preferredSide, input.preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home] : [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
    const roles = input.preferredRole ? [input.preferredRole, input.preferredRole === MultiplayerSquadRole.Starter ? MultiplayerSquadRole.Substitute : MultiplayerSquadRole.Starter] : [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];
    for (const side of sides) {
      for (const squadRole of roles) {
        const limit = squadRole === MultiplayerSquadRole.Starter ? session.maxStartersPerSide : session.maxSubstitutesPerSide;
        for (let slotNumber = 1; slotNumber <= limit; slotNumber += 1) {
          if (!session.participants.some((participant) => participant.side === side && participant.squadRole === squadRole && participant.slotNumber === slotNumber)) {
            return {
              id: `participant-${session.participants.length + 1}`,
              sessionId: session.id,
              side,
              slotNumber,
              squadRole,
              kind: MultiplayerParticipantKind.Human,
              userId: input.userId,
              playerId: input.playerId,
              playerName: input.playerName,
              isHost: false,
              isCaptain: squadRole === MultiplayerSquadRole.Starter && !session.participants.some((participant) => participant.side === side && participant.isCaptain),
              joinedAt: new Date('2026-03-19T12:30:00.000Z')
            };
          }
        }
      }
    }
    throw new DomainError('Sessão lotada');
  }

  _summarize(session) {
    const filterSide = (side, role) => session.participants.filter((participant) => participant.side === side && participant.squadRole === role);
    const homeStarters = filterSide(MultiplayerTeamSide.Home, MultiplayerSquadRole.Starter);
    const homeSubs = filterSide(MultiplayerTeamSide.Home, MultiplayerSquadRole.Substitute);
    const awayStarters = filterSide(MultiplayerTeamSide.Away, MultiplayerSquadRole.Starter);
    const awaySubs = filterSide(MultiplayerTeamSide.Away, MultiplayerSquadRole.Substitute);
    const home = {
      side: MultiplayerTeamSide.Home,
      starters: homeStarters,
      substitutes: homeSubs,
      humanCount: session.participants.filter((participant) => participant.side === MultiplayerTeamSide.Home && participant.kind === MultiplayerParticipantKind.Human).length,
      botCount: session.participants.filter((participant) => participant.side === MultiplayerTeamSide.Home && participant.kind === MultiplayerParticipantKind.Bot).length,
      startersCount: homeStarters.length,
      substitutesCount: homeSubs.length,
      remainingStarterSlots: Math.max(session.maxStartersPerSide - homeStarters.length, 0),
      remainingSubstituteSlots: Math.max(session.maxSubstitutesPerSide - homeSubs.length, 0)
    };
    const away = {
      side: MultiplayerTeamSide.Away,
      starters: awayStarters,
      substitutes: awaySubs,
      humanCount: session.participants.filter((participant) => participant.side === MultiplayerTeamSide.Away && participant.kind === MultiplayerParticipantKind.Human).length,
      botCount: session.participants.filter((participant) => participant.side === MultiplayerTeamSide.Away && participant.kind === MultiplayerParticipantKind.Bot).length,
      startersCount: awayStarters.length,
      substitutesCount: awaySubs.length,
      remainingStarterSlots: Math.max(session.maxStartersPerSide - awayStarters.length, 0),
      remainingSubstituteSlots: Math.max(session.maxSubstitutesPerSide - awaySubs.length, 0)
    };
    const totalHumanCount = session.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length;
    const totalBotCount = session.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot).length;
    const openSlots = home.remainingStarterSlots + home.remainingSubstituteSlots + away.remainingStarterSlots + away.remainingSubstituteSlots;
    const fallbackEligibleOpenSlots = Math.min(session.botFallbackEligibleSlots, openSlots);
    const missingHumansToStart = Math.max((session.minimumHumansToStart ?? 2) - totalHumanCount, 0);
    const canUseBotFallback = session.fillPolicy === MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback && fallbackEligibleOpenSlots > 0;
    const canPrepareMatch = home.startersCount > 0 && away.startersCount > 0 && missingHumansToStart === 0;
    return {
      ...session,
      participants: structuredClone(session.participants),
      home,
      away,
      totalHumanCount,
      totalBotCount,
      totalParticipants: session.participants.length,
      fallbackEligibleOpenSlots,
      canUseBotFallback,
      missingHumansToStart,
      canPrepareMatch
    };
  }
}

function createServices() {
  const repo = new InMemoryMultiplayerRepository();
  repo.registerPlayer({ telegramId: 'host', userId: 'user-host', playerId: 'player-host', playerName: 'Host FC' });
  repo.registerPlayer({ telegramId: 'p2', userId: 'user-p2', playerId: 'player-p2', playerName: 'Zico Azul' });
  repo.registerPlayer({ telegramId: 'p3', userId: 'user-p3', playerId: 'player-p3', playerName: 'Rina Costa' });
  repo.registerPlayer({ telegramId: 'p4', userId: 'user-p4', playerId: 'player-p4', playerName: 'Leo Norte' });
  repo.registerPlayer({ telegramId: 'p5', userId: 'user-p5', playerId: 'player-p5', playerName: 'Ivo Sul' });
  return {
    repo,
    createService: new CreateMultiplayerSessionService(repo),
    getService: new GetMultiplayerSessionService(repo),
    joinService: new JoinMultiplayerSessionService(repo),
    prepareService: new PrepareMultiplayerSessionService(repo)
  };
}

function createMatchSummary() {
  return {
    id: 'match-1',
    playerId: 'player-host',
    status: MatchStatus.InProgress,
    scoreboard: {
      homeClubName: 'Porto Azul FC',
      awayClubName: 'Aurora United',
      homeScore: 2,
      awayScore: 1,
      minute: 74,
      half: MatchHalf.Second,
      status: MatchStatus.InProgress,
      stoppageMinutes: 2
    },
    activeTurn: {
      id: 'turn-7',
      matchId: 'match-1',
      sequence: 7,
      minute: 74,
      half: MatchHalf.Second,
      possessionSide: MatchPossessionSide.Home,
      contextType: MatchContextType.ReceivedFree,
      contextText: 'Você recebeu livre na meia-lua.',
      availableActions: [{ key: MatchActionKey.Pass, label: 'Passar' }, { key: MatchActionKey.Shoot, label: 'Finalizar' }],
      deadlineAt: new Date('2026-03-19T13:00:30.000Z'),
      state: 'PENDING',
      isGoalkeeperContext: false,
      previousOutcome: 'Seu time recuperou a posse no meio-campo.'
    },
    recentEvents: [
      { type: 'GOAL', minute: 70, description: 'Gol do Porto Azul após triangulação.', createdAt: new Date('2026-03-19T12:58:00.000Z') },
      { type: 'FOUL', minute: 72, description: 'Falta sofrida na intermediária.', createdAt: new Date('2026-03-19T12:59:00.000Z') }
    ],
    yellowCards: 1,
    redCards: 0,
    suspensionMatchesRemaining: 0,
    energy: 68,
    injury: { severity: 1, matchesRemaining: 0, description: 'Desconforto leve no tornozelo' }
  };
}

test('cria sessão multiplayer multiusuário com host humano no lado HOME', async () => {
  const { createService } = createServices();
  const result = await createService.execute('host', {
    preferredSide: MultiplayerTeamSide.Home,
    preferredRole: MultiplayerSquadRole.Starter,
    maxStartersPerSide: 3,
    maxSubstitutesPerSide: 2,
    botFallbackEligibleSlots: 2,
    minimumHumansToStart: 2
  });

  assert.equal(result.session.totalParticipants, 1);
  assert.equal(result.session.home.startersCount, 1);
  assert.equal(result.session.home.starters[0].kind, MultiplayerParticipantKind.Human);
  assert.equal(result.session.home.starters[0].isHost, true);
  assert.equal(result.session.maxStartersPerSide, 3);
  assert.equal(result.session.home.remainingStarterSlots, 2);
});

test('permite vários humanos na mesma sessão, distinguindo HOME/AWAY e titular/reserva', async () => {
  const { createService, joinService, getService } = createServices();
  const created = await createService.execute('host');
  await joinService.execute('p2', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Starter });
  await joinService.execute('p3', created.session.code, { preferredSide: MultiplayerTeamSide.Home, preferredRole: MultiplayerSquadRole.Substitute });
  await joinService.execute('p4', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Substitute });
  const session = await getService.execute('host');

  assert.equal(session.totalParticipants, 4);
  assert.equal(session.home.startersCount, 1);
  assert.equal(session.home.substitutesCount, 1);
  assert.equal(session.away.startersCount, 1);
  assert.equal(session.away.substitutesCount, 1);
  assert.equal(session.home.substitutes[0].playerName, 'Rina Costa');
  assert.equal(session.away.substitutes[0].playerName, 'Leo Norte');
  assert.equal(session.canPrepareMatch, true);
  assert.ok(session.totalParticipants > 2);
});

test('aplica bots apenas como fallback elegível e preserva contagem por lado', async () => {
  const { createService, joinService, prepareService } = createServices();
  const created = await createService.execute('host', { botFallbackEligibleSlots: 2, maxStartersPerSide: 2, maxSubstitutesPerSide: 1 });
  await joinService.execute('p2', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Starter });
  const prepared = await prepareService.execute('host');

  assert.equal(prepared.botsAdded.length, 2);
  assert.equal(prepared.session.totalBotCount, 2);
  assert.equal(prepared.session.totalHumanCount, 2);
  assert.equal(prepared.session.home.botCount + prepared.session.away.botCount, 2);
  assert.equal(prepared.session.status, MultiplayerSessionStatus.ReadyToPrepare);
});

test('view models e renderers principais produzem cards visuais coerentes', async () => {
  const { createService, joinService, prepareService } = createServices();
  const renderer = new GameCardRenderer();
  const created = await createService.execute('host');
  await joinService.execute('p2', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Starter });
  const prepared = await prepareService.execute('host');

  const sessionVm = buildMultiplayerSessionCardViewModel(prepared.session);
  const squadVm = buildMultiplayerSquadCardViewModel(prepared.session, MultiplayerTeamSide.Home);
  const prepVm = buildMultiplayerPreparationCardViewModel(prepared.session);
  const matchVm = buildMatchCardViewModel(createMatchSummary());

  assert.match(renderer.renderMultiplayerSessionCard(prepared.session), /TeleSoccer Online/);
  assert.match(renderer.renderMultiplayerSquadCard(prepared.session, MultiplayerTeamSide.Home), /Titulares/);
  assert.match(renderer.renderMultiplayerPreparationCard(prepared.session), /Preparação do confronto/);
  assert.match(renderer.renderMatchCard(createMatchSummary()), /Match Center/);
  assert.match(sessionVm.matchup, /HOME/);
  assert.ok(squadVm.starters.length >= 1);
  assert.ok(prepVm.notes.length >= 3);
  assert.equal(matchVm.events.length, 2);
});

test('facade multiplayer entrega resposta visual e mantém linguagem humano-first', async () => {
  const { createService, getService, joinService, prepareService } = createServices();
  const renderer = new GameCardRenderer();
  const noop = { execute: async () => { throw new DomainError('not used'); } };
  const playerService = { execute: async () => ({ name: 'Host FC', age: 18, position: 'FORWARD', dominantFoot: 'RIGHT', currentClubName: 'Porto Azul FC', walletBalance: 100, attributes: { PASSING: 50 }, careerStatus: 'PROFESSIONAL' }) };
  const statusService = { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', walletBalance: 100, currentWeekNumber: 12, trainingAvailableThisWeek: true, totalTrainings: 1, totalTryouts: 1, latestTryout: null, recentHistory: [] }) };
  const historyService = { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) };
  const walletService = { execute: async () => ({ playerName: 'Host FC', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'PROFESSIONAL' }) };
  const facade = new Phase1TelegramFacade(
    { execute: async (input) => ({ name: input.name, walletBalance: 100, careerStatus: 'YOUTH' }) },
    playerService,
    statusService,
    historyService,
    walletService,
    noop,
    noop,
    noop,
    noop,
    noop,
    createService,
    getService,
    joinService,
    prepareService,
    renderer
  );

  const createdReply = await facade.handleCreateSession('host');
  assert.match(createdReply.text, /humano-first/);
  assert.match(createdReply.text, /HOME/);

  const code = /Código: (\w+)/.exec(createdReply.text)[1];
  const joinReply = await facade.handleJoinSession('p2', code, MultiplayerTeamSide.Away, MultiplayerSquadRole.Starter);
  assert.match(joinReply.text, /Entrada confirmada/);
  assert.match(joinReply.text, /AWAY/);

  const prepReply = await facade.handlePrepareSession('host');
  assert.match(prepReply.text, /Preparação do confronto/);
});
