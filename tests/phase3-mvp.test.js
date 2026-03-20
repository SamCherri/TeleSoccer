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
const { CareerStatus } = require('../dist/domain/shared/enums.js');
const { GameCardRenderer } = require('../dist/presentation/game-card-renderer.js');
const {
  buildOnlineWorldCardViewModel,
  buildWeeklyAgendaCardViewModel,
  buildMultiplayerSessionCardViewModel,
  buildMultiplayerSquadCardViewModel,
  buildMultiplayerPreparationCardViewModel,
  buildMatchCardViewModel
} = require('../dist/view-models/game-view-models.js');
const { Phase1TelegramFacade, phase1BotActions } = require('../dist/bot/phase1-bot.js');
const { Phase1TelegramDispatcher } = require('../dist/bot/phase1-dispatcher.js');
const { MatchStatus, MatchHalf, MatchPossessionSide, MatchContextType, MatchActionKey } = require('../dist/domain/match/types.js');
const { DomainError } = require('../dist/shared/errors.js');

class InMemoryMultiplayerRepository {
  constructor() {
    this.players = new Map();
    this.sessions = new Map();
    this.codeIndex = new Map();
    this.sequence = 0;
  }

  registerPlayer({ telegramId, userId, playerId, playerName, careerStatus = CareerStatus.Professional }) {
    this.players.set(telegramId, { telegramId, userId, playerId, playerName, careerStatus });
  }

  async findPlayerProfileByTelegramId(telegramId) {
    return this.players.get(telegramId) ?? null;
  }

  async createSession(input) {
    const id = `session-${++this.sequence}`;
    const code = `CODE${this.sequence}`;
    const hostSlotKey = `${input.preferredSide}:${input.preferredRole}:1`;
    const otherSide = input.preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home;
    const slots = [];
    for (const side of [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away]) {
      for (let slotNumber = 1; slotNumber <= input.maxStartersPerSide; slotNumber += 1) {
        slots.push({ id: `slot-${id}-${side}-STARTER-${slotNumber}`, sessionId: id, side, squadRole: MultiplayerSquadRole.Starter, slotNumber, isBotFallbackEligible: false });
      }
      for (let slotNumber = 1; slotNumber <= input.maxSubstitutesPerSide; slotNumber += 1) {
        slots.push({ id: `slot-${id}-${side}-SUB-${slotNumber}`, sessionId: id, side, squadRole: MultiplayerSquadRole.Substitute, slotNumber, isBotFallbackEligible: false });
      }
    }
    const priority = slots
      .filter((slot) => `${slot.side}:${slot.squadRole}:${slot.slotNumber}` !== hostSlotKey)
      .filter((slot) => !(slot.squadRole === MultiplayerSquadRole.Starter && slot.slotNumber === 1))
      .sort((left, right) => {
        const leftPriority = left.squadRole === MultiplayerSquadRole.Starter ? 0 : 1;
        const rightPriority = right.squadRole === MultiplayerSquadRole.Starter ? 0 : 1;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        const leftSidePriority = left.side === otherSide ? 0 : 1;
        const rightSidePriority = right.side === otherSide ? 0 : 1;
        if (leftSidePriority !== rightSidePriority) return leftSidePriority - rightSidePriority;
        return left.slotNumber - right.slotNumber;
      })
      .slice(0, input.botFallbackEligibleSlots);
    const eligible = new Set(priority.map((slot) => slot.id));
    slots.forEach((slot) => {
      slot.isBotFallbackEligible = eligible.has(slot.id);
    });

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
      slots,
      participants: []
    };
    const hostSlot = slots.find((slot) => slot.side === input.preferredSide && slot.squadRole === input.preferredRole && slot.slotNumber === 1);
    session.participants.push({
      id: `participant-${this.sequence}-1`,
      sessionId: id,
      slotId: hostSlot.id,
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
    });
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

    const sides = input.preferredSide ? [input.preferredSide, input.preferredSide === MultiplayerTeamSide.Home ? MultiplayerTeamSide.Away : MultiplayerTeamSide.Home] : [MultiplayerTeamSide.Home, MultiplayerTeamSide.Away];
    const roles = input.preferredRole ? [input.preferredRole, input.preferredRole === MultiplayerSquadRole.Starter ? MultiplayerSquadRole.Substitute : MultiplayerSquadRole.Starter] : [MultiplayerSquadRole.Starter, MultiplayerSquadRole.Substitute];
    let chosenSlot = null;
    for (const side of sides) {
      for (const squadRole of roles) {
        chosenSlot = session.slots.find((slot) => slot.side === side && slot.squadRole === squadRole && !session.participants.some((participant) => participant.slotId === slot.id));
        if (chosenSlot) break;
      }
      if (chosenSlot) break;
    }
    if (!chosenSlot) throw new DomainError('Sessão lotada');

    const participant = {
      id: `participant-${session.participants.length + 1}`,
      sessionId: session.id,
      slotId: chosenSlot.id,
      side: chosenSlot.side,
      slotNumber: chosenSlot.slotNumber,
      squadRole: chosenSlot.squadRole,
      kind: MultiplayerParticipantKind.Human,
      userId: input.userId,
      playerId: input.playerId,
      playerName: input.playerName,
      isHost: false,
      isCaptain: chosenSlot.squadRole === MultiplayerSquadRole.Starter && !session.participants.some((entry) => entry.side === chosenSlot.side && entry.isCaptain),
      joinedAt: new Date('2026-03-19T12:30:00.000Z')
    };
    session.participants.push(participant);
    session.updatedAt = new Date('2026-03-19T12:30:00.000Z');
    const summary = this._summarize(session);
    session.status = summary.canPrepareMatch ? MultiplayerSessionStatus.ReadyToPrepare : summary.canUseBotFallbackNow ? MultiplayerSessionStatus.ReadyForFallback : MultiplayerSessionStatus.WaitingForPlayers;
    return { session: this._summarize(session), participant };
  }

  async addBotFallbackParticipants(input) {
    const session = this.sessions.get(input.sessionId);
    const createdParticipants = [];
    for (const bot of input.bots) {
      if (session.participants.some((participant) => participant.slotId === bot.slotId)) {
        continue;
      }
      const participant = {
        id: `bot-${session.participants.length + 1}`,
        sessionId: session.id,
        slotId: bot.slotId,
        side: bot.side,
        slotNumber: bot.slotNumber,
        squadRole: bot.squadRole,
        kind: MultiplayerParticipantKind.Bot,
        playerName: bot.playerName,
        isHost: false,
        isCaptain: false,
        joinedAt: new Date('2026-03-19T12:45:00.000Z')
      };
      session.participants.push(participant);
      createdParticipants.push(participant);
    }
    const summary = this._summarize(session);
    session.status = summary.canPrepareMatch ? MultiplayerSessionStatus.ReadyToPrepare : summary.canUseBotFallbackNow ? MultiplayerSessionStatus.ReadyForFallback : MultiplayerSessionStatus.WaitingForPlayers;
    return { session: this._summarize(session), createdParticipants };
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

  _summarize(session) {
    const slots = session.slots.map((slot) => ({
      ...slot,
      occupiedByParticipantId: session.participants.find((participant) => participant.slotId === slot.id)?.id
    }));
    const buildSide = (side) => {
      const sideParticipants = session.participants.filter((participant) => participant.side === side);
      const sideSlots = slots.filter((slot) => slot.side === side);
      const starters = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Starter);
      const substitutes = sideParticipants.filter((participant) => participant.squadRole === MultiplayerSquadRole.Substitute);
      return {
        side,
        starters,
        substitutes,
        humanCount: sideParticipants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length,
        botCount: sideParticipants.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot).length,
        startersCount: starters.length,
        substitutesCount: substitutes.length,
        remainingStarterSlots: sideSlots.filter((slot) => slot.squadRole === MultiplayerSquadRole.Starter).length - starters.length,
        remainingSubstituteSlots: sideSlots.filter((slot) => slot.squadRole === MultiplayerSquadRole.Substitute).length - substitutes.length,
        botFallbackEligibleOpenSlots: sideSlots.filter((slot) => slot.isBotFallbackEligible && !slot.occupiedByParticipantId).length
      };
    };

    const home = buildSide(MultiplayerTeamSide.Home);
    const away = buildSide(MultiplayerTeamSide.Away);
    const totalHumanCount = session.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Human).length;
    const totalBotCount = session.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot).length;
    const fallbackEligibleOpenSlots = slots.filter((slot) => slot.isBotFallbackEligible && !slot.occupiedByParticipantId).length;
    const missingHumansToStart = Math.max((session.minimumHumansToStart ?? 2) - totalHumanCount, 0);
    const hasHumanStarterOnEachSide =
      home.starters.some((participant) => participant.kind === MultiplayerParticipantKind.Human) &&
      away.starters.some((participant) => participant.kind === MultiplayerParticipantKind.Human);
    const canUseBotFallbackNow =
      session.fillPolicy === MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback &&
      hasHumanStarterOnEachSide &&
      missingHumansToStart === 0 &&
      fallbackEligibleOpenSlots > 0;
    const canPrepareMatch = hasHumanStarterOnEachSide && missingHumansToStart === 0 && fallbackEligibleOpenSlots === 0;

    return {
      ...session,
      slots,
      participants: structuredClone(session.participants),
      home,
      away,
      totalHumanCount,
      totalBotCount,
      totalParticipants: session.participants.length,
      fallbackEligibleOpenSlots,
      canUseBotFallbackNow,
      missingHumansToStart,
      hasHumanStarterOnEachSide,
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
  repo.registerPlayer({ telegramId: 'youth', userId: 'user-youth', playerId: 'player-youth', playerName: 'Base Kid', careerStatus: CareerStatus.Youth });
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

test('cria sessão multiplayer multiusuário com host humano no lado HOME e slots persistidos', async () => {
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
  assert.equal(result.session.slots.length, 10);
  assert.equal(result.session.fallbackEligibleOpenSlots, 2);
});

test('bloqueia multiplayer para jogador não profissional', async () => {
  const { createService, joinService } = createServices();
  await assert.rejects(() => createService.execute('youth'), /jogador profissional/);

  const created = await createService.execute('host');
  await assert.rejects(() => joinService.execute('youth', created.session.code), /jogador profissional/);
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
  assert.equal(session.canUseBotFallbackNow, true);
  assert.equal(session.canPrepareMatch, false);
});

test('fallback não entra cedo demais e preparação é exclusiva do host', async () => {
  const { createService, joinService, prepareService } = createServices();
  const created = await createService.execute('host', { botFallbackEligibleSlots: 2, maxStartersPerSide: 2, maxSubstitutesPerSide: 1, minimumHumansToStart: 3 });
  await joinService.execute('p2', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Starter });

  await assert.rejects(() => prepareService.execute('p2'), /Somente o host/);
  const firstPrepare = await prepareService.execute('host');
  assert.equal(firstPrepare.botsAdded.length, 0);
  assert.equal(firstPrepare.session.totalBotCount, 0);

  await joinService.execute('p3', created.session.code, { preferredSide: MultiplayerTeamSide.Home, preferredRole: MultiplayerSquadRole.Substitute });
  const secondPrepare = await prepareService.execute('host');
  assert.equal(secondPrepare.botsAdded.length, 2);
  assert.equal(secondPrepare.session.totalBotCount, 2);
  assert.equal(secondPrepare.session.status, MultiplayerSessionStatus.PreparingMatch);
});

test('preparação retorna apenas bots criados agora, não repete bots antigos', async () => {
  const { createService, joinService, prepareService } = createServices();
  const created = await createService.execute('host', { botFallbackEligibleSlots: 2, maxStartersPerSide: 2, maxSubstitutesPerSide: 1 });
  await joinService.execute('p2', created.session.code, { preferredSide: MultiplayerTeamSide.Away, preferredRole: MultiplayerSquadRole.Starter });

  const firstPrepare = await prepareService.execute('host');
  assert.equal(firstPrepare.botsAdded.length, 2);

  const secondPrepare = await prepareService.execute('host');
  assert.equal(secondPrepare.botsAdded.length, 0);
  assert.equal(secondPrepare.session.totalBotCount, 2);
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
  const onlineVm = buildOnlineWorldCardViewModel({
    playerName: 'Host FC',
    age: 18,
    position: 'FORWARD',
    careerStatus: 'PROFESSIONAL',
    currentClubName: 'Porto Azul FC',
    walletBalance: 100,
    currentWeekNumber: 12,
    trainingAvailableThisWeek: true,
    activeMatch: createMatchSummary(),
    currentSession: prepared.session,
    canTryout: false
  });
  const agendaVm = buildWeeklyAgendaCardViewModel({
    playerName: 'Host FC',
    currentWeekNumber: 12,
    trainingAvailableThisWeek: true,
    careerStatus: 'PROFESSIONAL',
    hasActiveMatch: true,
    hasCurrentSession: true,
    canTryout: false
  });

  assert.match(renderer.renderMultiplayerSessionCard(prepared.session), /SALA DE CONVOCAÇÃO/);
  assert.match(renderer.renderMultiplayerSquadCard(prepared.session, MultiplayerTeamSide.Home), /TITULARES/);
  assert.match(renderer.renderMultiplayerPreparationCard(prepared.session), /AQUECIMENTO DO CONFRONTO/);
  assert.match(renderer.renderMatchCard(createMatchSummary()), /ESTÁDIO/);
  assert.match(renderer.renderOnlineWorldCard({ playerName: 'Host FC', age: 18, position: 'FORWARD', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', walletBalance: 100, currentWeekNumber: 12, trainingAvailableThisWeek: true, activeMatch: createMatchSummary(), currentSession: prepared.session, canTryout: false }), /VIDA NO FUTEBOL/);
  assert.match(renderer.renderWeeklyAgendaCard({ playerName: 'Host FC', currentWeekNumber: 12, trainingAvailableThisWeek: true, careerStatus: 'PROFESSIONAL', hasActiveMatch: true, hasCurrentSession: true, canTryout: false }), /AGENDA DA SEMANA/);
  assert.match(sessionVm.matchup, /HOME/);
  assert.ok(squadVm.starters.length >= 1);
  assert.ok(prepVm.notes.length >= 4);
  assert.equal(matchVm.events.length, 2);
  assert.match(onlineVm.routineLine, /Rotina da semana/);
  assert.equal(agendaVm.commitments.length, 3);
});

test('facade multiplayer entrega resposta visual, reforça humano-first e respeita host-only prepare', async () => {
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

  const hubReply = await facade.handleMultiplayerHub('host');
  assert.match(hubReply.text, /VIDA NO FUTEBOL/);
  assert.match(hubReply.text, /mundo contínuo de futebol/);
  assert.deepEqual(
    hubReply.actions,
    [
      phase1BotActions.mainMenu,
      phase1BotActions.careerStatus,
      phase1BotActions.weekAgenda,
      phase1BotActions.weeklyTraining,
      phase1BotActions.startMatch,
      phase1BotActions.createSession,
      phase1BotActions.lockerRoom,
      phase1BotActions.invitations
    ]
  );

  const createdReply = await facade.handleCreateSession('host');
  assert.match(createdReply.text, /convocação do confronto/);
  assert.match(createdReply.text, /HOME/);

  const code = /Código da convocação: (\w+)/.exec(createdReply.text)[1];
  const joinReply = await facade.handleJoinSession('p2', code, MultiplayerTeamSide.Away, MultiplayerSquadRole.Starter);
  assert.match(joinReply.text, /Convocação aceita/);
  assert.match(joinReply.text, /AWAY/);

  const prepReply = await facade.handlePrepareSession('host');
  assert.match(prepReply.text, /apoio\(s\) automático\(s\)|prioridade humana/);
  assert.ok(prepReply.actions.includes(phase1BotActions.currentSession));
  assert.ok(prepReply.actions.includes(phase1BotActions.lockerRoom));
});

test('consulta /sala CODIGO permite leitura por profissional com o código mesmo sem participar', async () => {
  const { createService, getService } = createServices();
  const created = await createService.execute('host');
  const outsiderView = await getService.execute('p5', created.session.code);
  assert.equal(outsiderView.code, created.session.code);
  assert.equal(outsiderView.totalParticipants, 1);
});

test('handleCurrentSession distingue sessão própria de consulta externa ao montar ações', async () => {
  const { createService, getService } = createServices();
  const renderer = new GameCardRenderer();
  const noop = { execute: async () => { throw new DomainError('not used'); } };
  const playerLookup = (telegramId) => ({
    execute: async () => {
      if (telegramId === 'host') {
        return { name: 'Host FC', age: 18, position: 'FORWARD', dominantFoot: 'RIGHT', currentClubName: 'Porto Azul FC', walletBalance: 100, attributes: { PASSING: 50 }, careerStatus: 'PROFESSIONAL' };
      }
      return { name: 'Ivo Sul', age: 18, position: 'FORWARD', dominantFoot: 'RIGHT', currentClubName: 'Porto Azul FC', walletBalance: 100, attributes: { PASSING: 50 }, careerStatus: 'PROFESSIONAL' };
    }
  });
  const statusLookup = (telegramId) => ({
    execute: async () => ({
      playerName: telegramId === 'host' ? 'Host FC' : 'Ivo Sul',
      careerStatus: 'PROFESSIONAL',
      currentClubName: 'Porto Azul FC',
      walletBalance: 100,
      currentWeekNumber: 12,
      trainingAvailableThisWeek: true,
      totalTrainings: 1,
      totalTryouts: 1,
      latestTryout: null,
      recentHistory: []
    })
  });

  const created = await createService.execute('host');

  const hostFacade = new Phase1TelegramFacade(
    { execute: async () => ({ name: 'Host FC', walletBalance: 100, careerStatus: 'YOUTH' }) },
    { execute: async () => playerLookup('host').execute() },
    { execute: async () => statusLookup('host').execute() },
    { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Host FC', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'PROFESSIONAL' }) },
    noop,
    noop,
    noop,
    { execute: async () => { throw new DomainError('not used'); }, executeOptional: async () => null },
    noop,
    undefined,
    getService,
    undefined,
    undefined,
    renderer
  );

  const outsiderFacade = new Phase1TelegramFacade(
    { execute: async () => ({ name: 'Ivo Sul', walletBalance: 100, careerStatus: 'YOUTH' }) },
    { execute: async () => playerLookup('p5').execute() },
    { execute: async () => statusLookup('p5').execute() },
    { execute: async () => ({ playerName: 'Ivo Sul', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Ivo Sul', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'PROFESSIONAL' }) },
    noop,
    noop,
    noop,
    { execute: async () => { throw new DomainError('not used'); }, executeOptional: async () => null },
    noop,
    undefined,
    getService,
    undefined,
    undefined,
    renderer
  );

  const ownReply = await hostFacade.handleCurrentSession('host', created.session.code);
  assert.match(ownReply.text, /faz parte da sua jornada atual/);
  assert.ok(ownReply.actions.includes(phase1BotActions.currentSession));
  assert.ok(ownReply.actions.includes(phase1BotActions.lockerRoom));

  const outsiderReply = await outsiderFacade.handleCurrentSession('p5', created.session.code);
  assert.match(outsiderReply.text, /apenas observando uma convocação externa/);
  assert.deepEqual(outsiderReply.actions, [
    phase1BotActions.mainMenu,
    phase1BotActions.weekAgenda,
    phase1BotActions.createSession,
    phase1BotActions.invitations
  ]);
});

test('dispatcher valida comando multiplayer inválido com orientação clara', async () => {
  const { createService, getService, joinService, prepareService } = createServices();
  const renderer = new GameCardRenderer();
  const noop = { execute: async () => { throw new DomainError('not used'); } };
  const facade = new Phase1TelegramFacade(
    { execute: async () => ({ name: 'Host FC', walletBalance: 100, careerStatus: 'YOUTH' }) },
    { execute: async () => ({ name: 'Host FC', age: 18, position: 'FORWARD', dominantFoot: 'RIGHT', currentClubName: 'Porto Azul FC', walletBalance: 100, attributes: { PASSING: 50 }, careerStatus: 'PROFESSIONAL' }) },
    { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', walletBalance: 100, currentWeekNumber: 12, trainingAvailableThisWeek: true, totalTrainings: 1, totalTryouts: 1, latestTryout: null, recentHistory: [] }) },
    { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Host FC', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'PROFESSIONAL' }) },
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
  const creationFlow = {
    expireIfNeeded: async () => null,
    isActive: async () => false,
    cancel: async () => ({ text: 'cancel', actions: [] }),
    remindCurrentStep: async () => ({ text: 'remind', actions: [] }),
    handleInput: async () => ({ kind: 'reply', reply: { text: 'reply', actions: [] } }),
    start: async () => ({ text: 'start', actions: [] })
  };
  const dispatcher = new Phase1TelegramDispatcher(facade, creationFlow);

  const invalidSide = await dispatcher.dispatch({ telegramId: 'host', text: '/entrar-sala ABC123 CENTRO TITULAR' });
  assert.match(invalidSide.text, /Lado inválido/);

  const invalidRole = await dispatcher.dispatch({ telegramId: 'host', text: '/entrar-sala ABC123 HOME BANCO' });
  assert.match(invalidRole.text, /Papel inválido/);
});

test('compatibilidade com /mmorpg e /multiplayer leva ao mesmo mundo do jogador', async () => {
  const { getService } = createServices();
  const renderer = new GameCardRenderer();
  const noop = { execute: async () => { throw new DomainError('not used'); } };
  const facade = new Phase1TelegramFacade(
    { execute: async () => ({ name: 'Host FC', walletBalance: 100, careerStatus: 'YOUTH' }) },
    { execute: async () => ({ name: 'Host FC', age: 18, position: 'FORWARD', dominantFoot: 'RIGHT', currentClubName: 'Porto Azul FC', walletBalance: 100, attributes: { PASSING: 50 }, careerStatus: 'PROFESSIONAL' }) },
    { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', walletBalance: 100, currentWeekNumber: 12, trainingAvailableThisWeek: true, totalTrainings: 1, totalTryouts: 1, latestTryout: null, recentHistory: [] }) },
    { execute: async () => ({ playerName: 'Host FC', careerStatus: 'PROFESSIONAL', currentClubName: 'Porto Azul FC', entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Host FC', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'PROFESSIONAL' }) },
    noop,
    noop,
    noop,
    { execute: async () => { throw new DomainError('not used'); }, executeOptional: async () => null },
    undefined,
    getService,
    undefined,
    undefined,
    renderer
  );
  const creationFlow = {
    expireIfNeeded: async () => null,
    isActive: async () => false,
    cancel: async () => ({ text: 'cancel', actions: [] }),
    remindCurrentStep: async () => ({ text: 'remind', actions: [] }),
    handleInput: async () => ({ kind: 'reply', reply: { text: 'reply', actions: [] } }),
    start: async () => ({ text: 'start', actions: [] })
  };
  const dispatcher = new Phase1TelegramDispatcher(facade, creationFlow);

  const mmorpgReply = await dispatcher.dispatch({ telegramId: 'host', text: '/mmorpg' });
  const multiplayerReply = await dispatcher.dispatch({ telegramId: 'host', text: '/multiplayer' });

  assert.match(mmorpgReply.text, /MUNDO DO JOGADOR/);
  assert.equal(multiplayerReply.text, mmorpgReply.text);
  assert.deepEqual(multiplayerReply.actions, mmorpgReply.actions);
});

test('buildWorldActions permanece contextual e não força caminhos profissionais para jogador de base', async () => {
  const facade = new Phase1TelegramFacade(
    { execute: async () => ({ name: 'Base Kid', walletBalance: 100, careerStatus: 'YOUTH' }) },
    { execute: async () => ({ name: 'Base Kid', age: 14, position: 'MIDFIELDER', dominantFoot: 'RIGHT', currentClubName: null, walletBalance: 100, attributes: { PASSING: 20 }, careerStatus: 'YOUTH' }) },
    { execute: async () => ({ playerName: 'Base Kid', careerStatus: 'YOUTH', currentClubName: null, walletBalance: 100, currentWeekNumber: 1, trainingAvailableThisWeek: true, totalTrainings: 0, totalTryouts: 0, latestTryout: null, recentHistory: [] }) },
    { execute: async () => ({ playerName: 'Base Kid', careerStatus: 'YOUTH', currentClubName: null, entries: [], totalEntries: 0 }) },
    { execute: async () => ({ playerName: 'Base Kid', walletBalance: 100, transactionCount: 0, recentTransactions: [], careerStatus: 'YOUTH' }) },
    { execute: async () => ({ newValue: 21, walletBalance: 80 }) },
    { execute: async () => ({ status: 'FAILED', score: 1, requiredScore: 2 }) }
  );

  assert.deepEqual(facade.buildWorldActions({ isProfessional: false, hasActiveMatch: false, hasCurrentSession: false }), [
    phase1BotActions.mainMenu,
    phase1BotActions.careerStatus,
    phase1BotActions.weekAgenda,
    phase1BotActions.weeklyTraining,
    phase1BotActions.tryout,
    phase1BotActions.invitations,
    phase1BotActions.playerCard,
    phase1BotActions.walletStatement
  ]);
  assert.deepEqual(facade.buildWorldActions({ isProfessional: true, hasActiveMatch: true, hasCurrentSession: true }), [
    phase1BotActions.mainMenu,
    phase1BotActions.careerStatus,
    phase1BotActions.weekAgenda,
    phase1BotActions.weeklyTraining,
    phase1BotActions.currentMatch,
    phase1BotActions.currentSession,
    phase1BotActions.lockerRoom,
    phase1BotActions.invitations
  ]);
});
