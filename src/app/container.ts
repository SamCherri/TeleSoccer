import { Phase1TelegramDispatcher } from '../bot/phase1-dispatcher';
import { Phase1TelegramFacade } from '../bot/phase1-bot';
import { Phase1PlayerCreationFlow } from '../bot/player-creation-flow';
import {
  CreatePlayerService,
  GetCareerHistoryService,
  GetCareerStatusService,
  GetPlayerCardService,
  GetWalletStatementService,
  TryoutService,
  WeeklyTrainingService
} from '../domain/player/services';
import { PrismaClubRepository } from '../infra/prisma/club-repository';
import { PrismaPlayerCreationConversationStore } from '../infra/prisma/player-creation-conversation-store';
import { PrismaPlayerRepository } from '../infra/prisma/player-repository';
import { MatchEngine } from '../domain/match/engine';
import { GetActiveMatchService, ResolveMatchTurnService, StartMatchService } from '../domain/match/services';
import { PrismaMatchRepository } from '../infra/prisma/match-repository';
import { CreateLobbyService, GetLobbyStatusService, JoinLobbyService } from '../domain/multiplayer/services';
import { PrismaMultiplayerLobbyRepository } from '../infra/prisma/multiplayer-repository';

export const buildContainer = () => {
  const playerRepository = new PrismaPlayerRepository();
  const clubRepository = new PrismaClubRepository();
  const playerCreationConversationStore = new PrismaPlayerCreationConversationStore();
  const matchRepository = new PrismaMatchRepository();
  const multiplayerLobbyRepository = new PrismaMultiplayerLobbyRepository();
  const matchEngine = new MatchEngine();

  const createPlayerService = new CreatePlayerService(playerRepository);
  const getPlayerCardService = new GetPlayerCardService(playerRepository);
  const getCareerStatusService = new GetCareerStatusService(playerRepository);
  const getCareerHistoryService = new GetCareerHistoryService(playerRepository);
  const getWalletStatementService = new GetWalletStatementService(playerRepository);
  const weeklyTrainingService = new WeeklyTrainingService(playerRepository);
  const tryoutService = new TryoutService(playerRepository, clubRepository);
  const startMatchService = new StartMatchService(matchRepository, matchEngine);
  const getActiveMatchService = new GetActiveMatchService(matchRepository, matchEngine);
  const resolveMatchTurnService = new ResolveMatchTurnService(matchRepository, matchEngine);
  const createLobbyService = new CreateLobbyService(multiplayerLobbyRepository);
  const joinLobbyService = new JoinLobbyService(multiplayerLobbyRepository);
  const getLobbyStatusService = new GetLobbyStatusService(multiplayerLobbyRepository);

  const phase1TelegramFacade = new Phase1TelegramFacade(
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getCareerHistoryService,
    getWalletStatementService,
    weeklyTrainingService,
    tryoutService,
    startMatchService,
    getActiveMatchService,
    resolveMatchTurnService,
    createLobbyService,
    joinLobbyService,
    getLobbyStatusService
  );
  const phase1PlayerCreationFlow = new Phase1PlayerCreationFlow(playerCreationConversationStore);

  return {
    createPlayerService,
    getPlayerCardService,
    getCareerStatusService,
    getCareerHistoryService,
    getWalletStatementService,
    weeklyTrainingService,
    tryoutService,
    startMatchService,
    getActiveMatchService,
    resolveMatchTurnService,
    createLobbyService,
    joinLobbyService,
    getLobbyStatusService,
    phase1TelegramFacade,
    phase1PlayerCreationFlow,
    phase1TelegramDispatcher: new Phase1TelegramDispatcher(phase1TelegramFacade, phase1PlayerCreationFlow)
  };
};
