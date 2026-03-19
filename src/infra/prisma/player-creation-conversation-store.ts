import { PlayerCreationConversationStore, PlayerCreationDraft, PlayerCreationSession } from '../../bot/conversation-store';
import { PlayerCreationStep } from '../../domain/shared/enums';
import { getPrismaClient } from './client';

interface PlayerCreationConversationRecord {
  telegramId: string;
  step: PlayerCreationStep;
  draft: PlayerCreationDraft;
  updatedAt: Date | string;
}

export class PrismaPlayerCreationConversationStore implements PlayerCreationConversationStore {
  async get(telegramId: string): Promise<PlayerCreationSession | null> {
    const prisma = getPrismaClient();
    const session = (await prisma.playerCreationConversation.findUnique({
      where: { telegramId }
    })) as PlayerCreationConversationRecord | null;

    if (!session) {
      return null;
    }

    return {
      telegramId: session.telegramId,
      step: session.step,
      draft: session.draft,
      updatedAt: new Date(session.updatedAt)
    };
  }

  async save(session: Omit<PlayerCreationSession, 'updatedAt'> | PlayerCreationSession): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.playerCreationConversation.upsert({
      where: { telegramId: session.telegramId },
      create: {
        telegramId: session.telegramId,
        step: session.step,
        draft: session.draft
      },
      update: {
        step: session.step,
        draft: session.draft
      }
    });
  }

  async clear(telegramId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.playerCreationConversation.deleteMany({
      where: { telegramId }
    });
  }
}
