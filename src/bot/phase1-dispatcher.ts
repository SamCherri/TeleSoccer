import { AttributeKey } from '../domain/shared/enums';
import { CreatePlayerInput } from '../domain/player/types';
import { DomainError } from '../shared/errors';
import { BotReply, phase1BotActions, Phase1TelegramFacade } from './phase1-bot';
import { Phase1PlayerCreationFlow } from './player-creation-flow';
import { MatchActionKey } from '../domain/match/types';
import { MultiplayerSquadRole, MultiplayerTeamSide } from '../domain/multiplayer/types';

export interface Phase1BotRequest {
  telegramId: string;
  text?: string;
  payload?: CreatePlayerInput;
}

const commandToAction = new Map<string, string>([
  ['/start', phase1BotActions.mainMenu],
  ['/menu', phase1BotActions.mainMenu],
  ['/ficha', phase1BotActions.playerCard],
  ['/carreira', phase1BotActions.careerStatus],
  ['/historico', phase1BotActions.careerHistory],
  ['/carteira', phase1BotActions.walletStatement],
  ['/treino', phase1BotActions.weeklyTraining],
  ['/peneira', phase1BotActions.tryout],
  ['/confirmar-peneira', phase1BotActions.confirmTryout],
  ['/partida', phase1BotActions.startMatch],
  ['/lance', phase1BotActions.currentMatch],
  ['/perder-lance', phase1BotActions.resolveTimeout],
  ['/agenda', phase1BotActions.weekAgenda],
  ['/vestiario', phase1BotActions.lockerRoom],
  ['/convocacoes', phase1BotActions.invitations],
  ['/multiplayer', phase1BotActions.mainMenu],
  ['/mmorpg', phase1BotActions.mainMenu],
  ['/criar-sala', phase1BotActions.createSession],
  ['/sala', phase1BotActions.currentSession],
  ['/preparar-sala', phase1BotActions.prepareSession],
  ['/cancelar', phase1BotActions.cancel],
  ['/criar-jogador', phase1BotActions.createPlayer]
]);

const trainingActionMap = new Map<string, AttributeKey>([
  [phase1BotActions.trainingPassing, AttributeKey.Passing],
  [phase1BotActions.trainingShooting, AttributeKey.Shooting],
  [phase1BotActions.trainingDribbling, AttributeKey.Dribbling],
  [phase1BotActions.trainingSpeed, AttributeKey.Speed],
  [phase1BotActions.trainingMarking, AttributeKey.Marking],
  [phase1BotActions.trainingReflexes, AttributeKey.Reflexes]
]);

const matchActionMap = new Map<string, MatchActionKey>([
  [phase1BotActions.matchPass, MatchActionKey.Pass],
  [phase1BotActions.matchDribble, MatchActionKey.Dribble],
  [phase1BotActions.matchShoot, MatchActionKey.Shoot],
  [phase1BotActions.matchControl, MatchActionKey.Control],
  [phase1BotActions.matchProtect, MatchActionKey.Protect],
  [phase1BotActions.matchTackle, MatchActionKey.Tackle],
  [phase1BotActions.matchClear, MatchActionKey.Clear],
  [phase1BotActions.matchSave, MatchActionKey.Save],
  [phase1BotActions.matchPunch, MatchActionKey.Punch],
  [phase1BotActions.matchCatch, MatchActionKey.Catch],
  [phase1BotActions.matchRushOut, MatchActionKey.RushOut],
  [phase1BotActions.matchRebound, MatchActionKey.Rebound],
  [phase1BotActions.matchHand, MatchActionKey.DistributeHand],
  [phase1BotActions.matchFoot, MatchActionKey.DistributeFoot],
  [phase1BotActions.matchLowLeft, MatchActionKey.AimLowLeft],
  [phase1BotActions.matchLowRight, MatchActionKey.AimLowRight],
  [phase1BotActions.matchHighLeft, MatchActionKey.AimHighLeft],
  [phase1BotActions.matchHighRight, MatchActionKey.AimHighRight]
]);

const parseSide = (value?: string): MultiplayerTeamSide | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'HOME') return MultiplayerTeamSide.Home;
  if (normalized === 'AWAY') return MultiplayerTeamSide.Away;
  return undefined;
};

const parseRole = (value?: string): MultiplayerSquadRole | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'TITULAR' || normalized === 'STARTER') return MultiplayerSquadRole.Starter;
  if (normalized === 'RESERVA' || normalized === 'SUBSTITUTE') return MultiplayerSquadRole.Substitute;
  return undefined;
};

const normalizeSlashCommand = (text: string): string => {
  if (!text.startsWith('/')) {
    return text;
  }

  const [command, ...rest] = text.split(/\s+/);
  return [command.toLowerCase(), ...rest].join(' ');
};

export class Phase1TelegramDispatcher {
  constructor(
    private readonly facade: Phase1TelegramFacade,
    private readonly creationFlow: Phase1PlayerCreationFlow
  ) {}

  async dispatch(request: Phase1BotRequest): Promise<BotReply> {
    const originalText = request.text?.trim() ?? '/start';
    const normalizedText = normalizeSlashCommand(originalText);
    const action = commandToAction.get(normalizedText) ?? originalText;

    try {
      const expirationReply = await this.creationFlow.expireIfNeeded(request.telegramId);
      if (expirationReply) {
        return expirationReply;
      }

      if (await this.creationFlow.isActive(request.telegramId)) {
        if (action === phase1BotActions.cancel) {
          return await this.creationFlow.cancel(request.telegramId);
        }

        if (commandToAction.has(normalizedText) && action !== phase1BotActions.createPlayer) {
          return await this.creationFlow.remindCurrentStep(request.telegramId);
        }

        const flowResult = await this.creationFlow.handleInput(request.telegramId, action);
        if (flowResult.kind === 'submit') {
          return await this.facade.handleCreatePlayer(flowResult.input);
        }

        return flowResult.reply;
      }

      if (normalizedText.startsWith('/entrar-sala')) {
        const parts = normalizedText.split(/\s+/);
        const [, code, sideToken, roleToken] = parts;
        if (!code) {
          return {
            text: 'Use /entrar-sala CODIGO [HOME|AWAY] [TITULAR|RESERVA]. Se omitir lado/papel, o sistema tenta encaixar a próxima vaga disponível.',
            actions: [phase1BotActions.mainMenu, phase1BotActions.currentSession]
          };
        }

        if (parts.length > 4) {
          return {
            text: 'Formato inválido. Exemplo válido: /entrar-sala ABC123 AWAY TITULAR',
            actions: [phase1BotActions.mainMenu]
          };
        }

        const parsedSide = parseSide(sideToken);
        const parsedRole = parseRole(roleToken);
        if (sideToken && !parsedSide) {
          return {
            text: 'Lado inválido. Use HOME ou AWAY ao entrar na sala.',
            actions: [phase1BotActions.mainMenu]
          };
        }
        if (roleToken && !parsedRole) {
          return {
            text: 'Papel inválido. Use TITULAR ou RESERVA ao entrar na sala.',
            actions: [phase1BotActions.mainMenu]
          };
        }

        return await this.facade.handleJoinSession(request.telegramId, code, parsedSide, parsedRole);
      }

      if (normalizedText.startsWith('/sala ')) {
        const [, code] = normalizedText.split(/\s+/);
        if (!code) {
          return await this.facade.handleCurrentSession(request.telegramId);
        }
        return await this.facade.handleCurrentSession(request.telegramId, code);
      }

      if (normalizedText.startsWith('/preparar-sala ')) {
        const [, code] = normalizedText.split(/\s+/);
        if (!code) {
          return await this.facade.handlePrepareSession(request.telegramId);
        }
        return await this.facade.handlePrepareSession(request.telegramId, code);
      }

      if (action === phase1BotActions.mainMenu || action === phase1BotActions.cancel) {
        return await this.facade.handleEntry(request.telegramId);
      }
      if (action === phase1BotActions.createPlayer) {
        if (request.payload) {
          return await this.facade.handleCreatePlayer(request.payload);
        }

        return await this.creationFlow.start(request.telegramId);
      }
      if (action === phase1BotActions.playerCard) {
        return await this.facade.handlePlayerCard(request.telegramId);
      }
      if (action === phase1BotActions.careerStatus) {
        return await this.facade.handleCareerStatus(request.telegramId);
      }
      if (action === phase1BotActions.careerHistory) {
        return await this.facade.handleCareerHistory(request.telegramId);
      }
      if (action === phase1BotActions.walletStatement) {
        return await this.facade.handleWalletStatement(request.telegramId);
      }
      if (action === phase1BotActions.weeklyTraining) {
        return await this.facade.handleTrainingMenu(request.telegramId);
      }
      if (action === phase1BotActions.weekAgenda) {
        return await this.facade.handleWeekAgenda(request.telegramId);
      }
      if (action === phase1BotActions.lockerRoom) {
        return await this.facade.handleLockerRoom(request.telegramId);
      }
      if (action === phase1BotActions.invitations) {
        return await this.facade.handleInvitations(request.telegramId);
      }
      if (action === phase1BotActions.tryout) {
        return await this.facade.handleTryoutPrompt(request.telegramId);
      }
      if (action === phase1BotActions.confirmTryout) {
        return await this.facade.handleTryout(request.telegramId);
      }
      if (action === phase1BotActions.startMatch) {
        return await this.facade.handleStartMatch(request.telegramId);
      }
      if (action === phase1BotActions.currentMatch) {
        return await this.facade.handleCurrentMatch(request.telegramId);
      }
      if (action === phase1BotActions.resolveTimeout) {
        return await this.facade.handleMatchAction(request.telegramId);
      }
      if (action === phase1BotActions.createSession) {
        return await this.facade.handleCreateSession(request.telegramId);
      }
      if (action === phase1BotActions.currentSession) {
        return await this.facade.handleCurrentSession(request.telegramId);
      }
      if (action === phase1BotActions.prepareSession) {
        return await this.facade.handlePrepareSession(request.telegramId);
      }

      const trainingFocus = trainingActionMap.get(action);
      if (trainingFocus) {
        return await this.facade.handleWeeklyTraining(request.telegramId, trainingFocus);
      }

      const matchAction = matchActionMap.get(action);
      if (matchAction) {
        return await this.facade.handleMatchAction(request.telegramId, matchAction);
      }

      return {
        text: 'Não entendi esse atalho. Volte para sua jornada principal ou use /mmorpg apenas como compatibilidade.',
        actions: [
          phase1BotActions.mainMenu,
          phase1BotActions.careerStatus,
          phase1BotActions.weekAgenda,
          phase1BotActions.weeklyTraining,
          phase1BotActions.invitations,
          phase1BotActions.playerCard,
          phase1BotActions.careerHistory,
          phase1BotActions.walletStatement,
          phase1BotActions.startMatch
        ]
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return {
          text: `Não foi possível concluir a ação: ${error.message}`,
          actions: [
            phase1BotActions.mainMenu,
            phase1BotActions.careerStatus,
            phase1BotActions.weekAgenda,
            phase1BotActions.weeklyTraining,
            phase1BotActions.invitations,
            phase1BotActions.playerCard,
            phase1BotActions.careerHistory,
            phase1BotActions.walletStatement,
            phase1BotActions.startMatch
          ]
        };
      }

      throw error;
    }
  }
}
