import { AttributeKey } from '../domain/shared/enums';
import { CreatePlayerInput } from '../domain/player/types';
import { DomainError } from '../shared/errors';
import { BotReply, phase1BotActions, Phase1TelegramFacade } from './phase1-bot';
import { Phase1PlayerCreationFlow } from './player-creation-flow';

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
  ['/carteira', phase1BotActions.walletStatement],
  ['/treino', phase1BotActions.weeklyTraining],
  ['/peneira', phase1BotActions.tryout],
  ['/confirmar-peneira', phase1BotActions.confirmTryout],
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

export class Phase1TelegramDispatcher {
  constructor(
    private readonly facade: Phase1TelegramFacade,
    private readonly creationFlow: Phase1PlayerCreationFlow
  ) {}

  async dispatch(request: Phase1BotRequest): Promise<BotReply> {
    const normalizedText = request.text?.trim() ?? '/start';
    const action = commandToAction.get(normalizedText) ?? normalizedText;

    try {
      if (this.creationFlow.isActive(request.telegramId)) {
        if (action === phase1BotActions.cancel) {
          return this.creationFlow.cancel(request.telegramId);
        }

        if (commandToAction.has(normalizedText) && action !== phase1BotActions.createPlayer) {
          return this.creationFlow.remindCurrentStep(request.telegramId);
        }

        const flowResult = this.creationFlow.handleInput(request.telegramId, action);
        if (flowResult.kind === 'submit') {
          return await this.facade.handleCreatePlayer(flowResult.input);
        }

        return flowResult.reply;
      }

      if (action === phase1BotActions.mainMenu) {
        return await this.facade.handleEntry(request.telegramId);
      }
      if (action === phase1BotActions.cancel) {
        return await this.facade.handleEntry(request.telegramId);
      }
      if (action === phase1BotActions.createPlayer) {
        if (request.payload) {
          return await this.facade.handleCreatePlayer(request.payload);
        }

        return this.creationFlow.start(request.telegramId);
      }
      if (action === phase1BotActions.playerCard) {
        return await this.facade.handlePlayerCard(request.telegramId);
      }
      if (action === phase1BotActions.careerStatus) {
        return await this.facade.handleCareerStatus(request.telegramId);
      }
      if (action === phase1BotActions.walletStatement) {
        return await this.facade.handleWalletStatement(request.telegramId);
      }
      if (action === phase1BotActions.weeklyTraining) {
        return await this.facade.handleTrainingMenu(request.telegramId);
      }
      if (action === phase1BotActions.tryout) {
        return await this.facade.handleTryoutPrompt(request.telegramId);
      }
      if (action === phase1BotActions.confirmTryout) {
        return await this.facade.handleTryout(request.telegramId);
      }

      const trainingFocus = trainingActionMap.get(action);
      if (trainingFocus) {
        return await this.facade.handleWeeklyTraining(request.telegramId, trainingFocus);
      }

      return {
        text: 'Comando não reconhecido nesta fase. Use o menu principal para continuar sua carreira.',
        actions: [phase1BotActions.mainMenu, phase1BotActions.playerCard, phase1BotActions.weeklyTraining]
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return {
          text: `Não foi possível concluir a ação: ${error.message}`,
          actions: [phase1BotActions.mainMenu, phase1BotActions.playerCard, phase1BotActions.weeklyTraining, phase1BotActions.tryout]
        };
      }

      throw error;
    }
  }
}
