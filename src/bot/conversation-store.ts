import { CreatePlayerInput } from '../domain/player/types';

export type PlayerCreationStep =
  | 'name'
  | 'nationality'
  | 'position'
  | 'dominantFoot'
  | 'heightCm'
  | 'weightKg'
  | 'skinTone'
  | 'hairStyle'
  | 'confirmation';

export interface PlayerCreationDraft {
  name?: CreatePlayerInput['name'];
  nationality?: CreatePlayerInput['nationality'];
  position?: CreatePlayerInput['position'];
  dominantFoot?: CreatePlayerInput['dominantFoot'];
  heightCm?: CreatePlayerInput['heightCm'];
  weightKg?: CreatePlayerInput['weightKg'];
  visual?: Partial<CreatePlayerInput['visual']>;
}

export interface PlayerCreationSession {
  telegramId: string;
  step: PlayerCreationStep;
  draft: PlayerCreationDraft;
}

export interface PlayerCreationConversationStore {
  get(telegramId: string): Promise<PlayerCreationSession | null>;
  save(session: PlayerCreationSession): Promise<void>;
  clear(telegramId: string): Promise<void>;
}

export class InMemoryPlayerCreationConversationStore implements PlayerCreationConversationStore {
  private readonly sessions = new Map<string, PlayerCreationSession>();

  async get(telegramId: string): Promise<PlayerCreationSession | null> {
    return this.sessions.get(telegramId) ?? null;
  }

  async save(session: PlayerCreationSession): Promise<void> {
    this.sessions.set(session.telegramId, session);
  }

  async clear(telegramId: string): Promise<void> {
    this.sessions.delete(telegramId);
  }
}
