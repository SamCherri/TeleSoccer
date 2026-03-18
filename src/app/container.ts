import { InMemoryPlayerCreationConversationStore } from '../bot/conversation-store';
import { Phase1TelegramDispatcher } from '../bot/phase1-dispatcher';
import { Phase1TelegramFacade } from '../bot/phase1-bot';
import { Phase1PlayerCreationFlow } from '../bot/player-creation-flow';
import {
  CreatePlayerService,
  GetCareerStatusService,
  GetPlayerCardService,
  GetWalletStatementService,
  TryoutService,
  WeeklyTrainingService
} from '../domain/player/services';
import { PrismaClubRepository } from '../infra/prisma/club-repository';
import { PrismaPlayerRepository } from '../infra/prisma/player-repository';

export const buildContainer = () => {
  const playerRepository = new PrismaPlayerRepository();
  const clubRepository = new PrismaClubRepository();
  const playerCreationConversationStore = new InMemoryPlayerCreationConversationStore();

  const createPlayerService = new CreatePlayerService(playerRepository);
  const getPlayerCardService = new GetPlayerCardService(playerRepository);
  const getCareerStatusService = new GetCareerStatusService(playerRepository);
  const getWalletStatementService = new GetWalletStatementService(playerRepository);
  const weeklyTrainingService = new WeeklyTrainingService(playerRepository);
  const tryoutService = new TryoutService(playerRepository, clubRepository);
  const phase1TelegramFacade = new Phase1TelegramFacade(
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getWalletStatementService,
    weeklyTrainingService,
    tryoutService
  );
  const phase1PlayerCreationFlow = new Phase1PlayerCreationFlow(playerCreationConversationStore);

  return {
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getWalletStatementService,
    weeklyTrainingService,
    tryoutService,
    phase1TelegramFacade,
    phase1PlayerCreationFlow,
    phase1TelegramDispatcher: new Phase1TelegramDispatcher(phase1TelegramFacade, phase1PlayerCreationFlow)
  };
};
