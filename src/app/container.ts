import { Phase1TelegramFacade } from '../bot/phase1-bot';
import { CreatePlayerService, GetPlayerCardService, TryoutService, WeeklyTrainingService } from '../domain/player/services';
import { PrismaClubRepository } from '../infra/prisma/club-repository';
import { PrismaPlayerRepository } from '../infra/prisma/player-repository';

export const buildContainer = () => {
  const playerRepository = new PrismaPlayerRepository();
  const clubRepository = new PrismaClubRepository();

  const createPlayerService = new CreatePlayerService(playerRepository);
  const getPlayerCardService = new GetPlayerCardService(playerRepository);
  const weeklyTrainingService = new WeeklyTrainingService(playerRepository);
  const tryoutService = new TryoutService(playerRepository, clubRepository);

  return {
    createPlayerService,
    getPlayerCardService,
    weeklyTrainingService,
    tryoutService,
    phase1TelegramFacade: new Phase1TelegramFacade(
      createPlayerService,
      getPlayerCardService,
      weeklyTrainingService,
      tryoutService
    )
  };
};
