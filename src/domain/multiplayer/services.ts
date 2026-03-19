import { CareerStatus } from '../shared/enums';
import { DomainError } from '../../shared/errors';
import { MultiplayerRepository, sideOrder, squadRoleOrder } from './repository';
import {
  CreateMultiplayerSessionResult,
  JoinMultiplayerSessionResult,
  MultiplayerParticipantKind,
  MultiplayerSessionFillPolicy,
  MultiplayerSessionStatus,
  MultiplayerSquadRole,
  MultiplayerTeamSide,
  PrepareMultiplayerSessionResult
} from './types';

const botNamePool = ['Bot Carlos', 'Bot Renato', 'Bot Davi', 'Bot Lucas', 'Bot Caio', 'Bot Yuri', 'Bot Murilo', 'Bot Enzo'];

const sideLabelMap: Record<MultiplayerTeamSide, string> = {
  [MultiplayerTeamSide.Home]: 'HOME',
  [MultiplayerTeamSide.Away]: 'AWAY'
};

const roleLabelMap: Record<MultiplayerSquadRole, string> = {
  [MultiplayerSquadRole.Starter]: 'titular',
  [MultiplayerSquadRole.Substitute]: 'reserva'
};

const assertProfessional = (careerStatus: CareerStatus, actionLabel: string): void => {
  if (careerStatus !== CareerStatus.Professional) {
    throw new DomainError(`${actionLabel} exige jogador profissional. Avance pela carreira antes de usar o multiplayer.`);
  }
};

const deriveTargetStatus = (session: { canPrepareMatch: boolean; canUseBotFallbackNow: boolean }): MultiplayerSessionStatus => {
  if (session.canPrepareMatch) {
    return MultiplayerSessionStatus.ReadyToPrepare;
  }
  if (session.canUseBotFallbackNow) {
    return MultiplayerSessionStatus.ReadyForFallback;
  }
  return MultiplayerSessionStatus.WaitingForPlayers;
};

export class CreateMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(
    telegramId: string,
    options?: {
      preferredSide?: MultiplayerTeamSide;
      preferredRole?: MultiplayerSquadRole;
      fillPolicy?: MultiplayerSessionFillPolicy;
      maxStartersPerSide?: number;
      maxSubstitutesPerSide?: number;
      botFallbackEligibleSlots?: number;
      minimumHumansToStart?: number;
    }
  ): Promise<CreateMultiplayerSessionResult> {
    const player = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador antes de abrir uma sala multiplayer.');
    }
    assertProfessional(player.careerStatus, 'Criar sala multiplayer');

    const existing = await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);
    if (existing) {
      return { session: existing };
    }

    const preferredSide = options?.preferredSide ?? MultiplayerTeamSide.Home;
    const preferredRole = options?.preferredRole ?? MultiplayerSquadRole.Starter;
    const fillPolicy = options?.fillPolicy ?? MultiplayerSessionFillPolicy.HumanPriorityWithBotFallback;
    const maxStartersPerSide = Math.max(options?.maxStartersPerSide ?? 3, 1);
    const maxSubstitutesPerSide = Math.max(options?.maxSubstitutesPerSide ?? 2, 0);
    const maxOpenSlots = maxStartersPerSide * 2 + maxSubstitutesPerSide * 2 - 1;
    const botFallbackEligibleSlots = Math.min(Math.max(options?.botFallbackEligibleSlots ?? 2, 0), Math.max(maxOpenSlots, 0));
    const minimumHumansToStart = Math.max(options?.minimumHumansToStart ?? 2, 2);

    const session = await this.multiplayerRepository.createSession({
      telegramId,
      hostUserId: player.userId,
      hostPlayerId: player.playerId,
      hostPlayerName: player.playerName,
      preferredSide,
      preferredRole,
      fillPolicy,
      maxStartersPerSide,
      maxSubstitutesPerSide,
      botFallbackEligibleSlots,
      minimumHumansToStart
    });

    return { session };
  }
}

export class GetMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(telegramId: string, sessionCode?: string) {
    const player = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador antes de consultar uma sessão multiplayer.');
    }
    assertProfessional(player.careerStatus, 'Consultar sala multiplayer');

    const session = sessionCode
      ? await this.multiplayerRepository.getSessionByCode(sessionCode.toUpperCase())
      : await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);

    if (!session) {
      throw new DomainError('Nenhuma sessão multiplayer encontrada. Use /criar-sala para abrir uma sala.');
    }

    return session;
  }

  async getOptionalCurrentSession(telegramId: string) {
    const player = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!player || player.careerStatus !== CareerStatus.Professional) {
      return null;
    }

    return this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);
  }
}

export class JoinMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(
    telegramId: string,
    sessionCode: string,
    options?: { preferredSide?: MultiplayerTeamSide; preferredRole?: MultiplayerSquadRole }
  ): Promise<JoinMultiplayerSessionResult> {
    const player = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!player) {
      throw new DomainError('Crie seu jogador antes de entrar em uma sala multiplayer.');
    }
    assertProfessional(player.careerStatus, 'Entrar em sala multiplayer');

    const existingSession = await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);
    if (existingSession && existingSession.code !== sessionCode.toUpperCase()) {
      throw new DomainError('Você já participa de outra sessão multiplayer. Consulte /sala antes de trocar de sessão.');
    }

    const session = await this.multiplayerRepository.getSessionByCode(sessionCode.toUpperCase());
    if (!session) {
      throw new DomainError('Código de sala inválido. Confira o código e tente novamente.');
    }
    if (session.status === MultiplayerSessionStatus.Closed) {
      throw new DomainError('Esta sessão já foi encerrada e não aceita novos participantes.');
    }

    const result = await this.multiplayerRepository.joinSession({
      sessionCode: session.code,
      telegramId,
      userId: player.userId,
      playerId: player.playerId,
      playerName: player.playerName,
      preferredSide: options?.preferredSide,
      preferredRole: options?.preferredRole
    });

    const targetStatus = deriveTargetStatus(result.session);
    const normalizedSession = result.session.status === targetStatus
      ? result.session
      : await this.multiplayerRepository.updateSessionStatus(result.session.id, targetStatus);

    return { session: normalizedSession, participant: result.participant };
  }
}

export class PrepareMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(telegramId: string, sessionCode?: string): Promise<PrepareMultiplayerSessionResult> {
    const requester = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!requester) {
      throw new DomainError('Crie seu jogador antes de preparar uma sala multiplayer.');
    }
    assertProfessional(requester.careerStatus, 'Preparar sala multiplayer');

    const session = sessionCode
      ? await this.multiplayerRepository.getSessionByCode(sessionCode.toUpperCase())
      : await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);

    if (!session) {
      throw new DomainError('Nenhuma sessão multiplayer encontrada para preparação.');
    }
    if (session.status === MultiplayerSessionStatus.Closed) {
      throw new DomainError('Esta sessão já foi encerrada e não pode mais ser preparada.');
    }

    const requesterParticipant = await this.multiplayerRepository.findParticipantByUser(session.id, requester.userId);
    if (!requesterParticipant) {
      throw new DomainError('Você não participa desta sessão multiplayer.');
    }
    if (!requesterParticipant.isHost) {
      throw new DomainError('Somente o host da sala pode preparar o confronto nesta etapa do produto.');
    }

    let workingSession = session;
    let createdBots = [] as PrepareMultiplayerSessionResult['botsAdded'];

    if (workingSession.canUseBotFallbackNow) {
      const eligibleOpenSlots = workingSession.slots.filter((slot) => slot.isBotFallbackEligible && !slot.occupiedByParticipantId);
      const bots = eligibleOpenSlots.map((slot, index) => ({
        slotId: slot.id,
        side: slot.side,
        squadRole: slot.squadRole,
        slotNumber: slot.slotNumber,
        playerName: `${botNamePool[index % botNamePool.length]} ${sideLabelMap[slot.side]} ${roleLabelMap[slot.squadRole]} ${slot.slotNumber}`
      }));

      if (bots.length > 0) {
        const botResult = await this.multiplayerRepository.addBotFallbackParticipants({ sessionId: workingSession.id, bots });
        workingSession = botResult.session;
        createdBots = botResult.createdParticipants;
      }
    }

    const targetStatus = deriveTargetStatus(workingSession);
    if (workingSession.status !== targetStatus) {
      workingSession = await this.multiplayerRepository.updateSessionStatus(workingSession.id, targetStatus);
    }

    return {
      session: workingSession,
      botsAdded: createdBots.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot)
    };
  }
}
