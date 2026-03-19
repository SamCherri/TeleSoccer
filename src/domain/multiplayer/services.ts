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

const botNamePool = [
  'Bot Carlos',
  'Bot Renato',
  'Bot Davi',
  'Bot Lucas',
  'Bot Caio',
  'Bot Yuri',
  'Bot Murilo',
  'Bot Enzo'
];

const sideLabelMap: Record<MultiplayerTeamSide, string> = {
  [MultiplayerTeamSide.Home]: 'HOME',
  [MultiplayerTeamSide.Away]: 'AWAY'
};

const roleLabelMap: Record<MultiplayerSquadRole, string> = {
  [MultiplayerSquadRole.Starter]: 'titular',
  [MultiplayerSquadRole.Substitute]: 'reserva'
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
      minimumHumansToStart: options?.minimumHumansToStart ?? 2
    });

    return { session };
  }
}

export class GetMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(telegramId: string, sessionCode?: string) {
    const session = sessionCode
      ? await this.multiplayerRepository.getSessionByCode(sessionCode.toUpperCase())
      : await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);

    if (!session) {
      throw new DomainError('Nenhuma sessão multiplayer encontrada. Use /criar-sala para abrir uma sala.');
    }

    return session;
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

    return result;
  }
}

export class PrepareMultiplayerSessionService {
  constructor(private readonly multiplayerRepository: MultiplayerRepository) {}

  async execute(telegramId: string, sessionCode?: string): Promise<PrepareMultiplayerSessionResult> {
    const session = sessionCode
      ? await this.multiplayerRepository.getSessionByCode(sessionCode.toUpperCase())
      : await this.multiplayerRepository.getCurrentSessionForTelegramUser(telegramId);

    if (!session) {
      throw new DomainError('Nenhuma sessão multiplayer encontrada para preparação.');
    }

    let workingSession = session;
    const requester = await this.multiplayerRepository.findPlayerProfileByTelegramId(telegramId);
    if (!requester) {
      throw new DomainError('Jogador não encontrado para preparar a sessão.');
    }
    const requesterParticipant = await this.multiplayerRepository.findParticipantByUser(session.id, requester.userId);
    if (!requesterParticipant) {
      throw new DomainError('Você não participa desta sessão multiplayer.');
    }

    const bots = [];
    if (workingSession.canUseBotFallback) {
      let remainingFallback = workingSession.fallbackEligibleOpenSlots;
      let botIndex = 0;
      for (const side of sideOrder) {
        const sideState = side === MultiplayerTeamSide.Home ? workingSession.home : workingSession.away;
        for (const squadRole of squadRoleOrder) {
          const limit = squadRole === MultiplayerSquadRole.Starter ? workingSession.maxStartersPerSide : workingSession.maxSubstitutesPerSide;
          const usedSlots = new Set(
            workingSession.participants
              .filter((participant) => participant.side === side && participant.squadRole === squadRole)
              .map((participant) => participant.slotNumber)
          );
          for (let slotNumber = 1; slotNumber <= limit && remainingFallback > 0; slotNumber += 1) {
            if (!usedSlots.has(slotNumber)) {
              bots.push({
                side,
                squadRole,
                slotNumber,
                playerName: `${botNamePool[botIndex % botNamePool.length]} ${sideLabelMap[side]} ${roleLabelMap[squadRole]} ${slotNumber}`
              });
              remainingFallback -= 1;
              botIndex += 1;
            }
          }
        }
      }

      if (bots.length > 0) {
        workingSession = await this.multiplayerRepository.addBotFallbackParticipants({ sessionId: workingSession.id, bots });
      }
    }

    const targetStatus = workingSession.canPrepareMatch
      ? MultiplayerSessionStatus.ReadyToPrepare
      : workingSession.canUseBotFallback
        ? MultiplayerSessionStatus.ReadyForFallback
        : MultiplayerSessionStatus.WaitingForPlayers;
    if (workingSession.status !== targetStatus) {
      workingSession = await this.multiplayerRepository.updateSessionStatus(workingSession.id, targetStatus);
    }

    return {
      session: workingSession,
      botsAdded: workingSession.participants.filter((participant) => participant.kind === MultiplayerParticipantKind.Bot).slice(-bots.length)
    };
  }
}
