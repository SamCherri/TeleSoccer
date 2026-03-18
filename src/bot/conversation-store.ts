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
  get(telegramId: string): PlayerCreationSession | null;
  save(session: PlayerCreationSession): void;
  clear(telegramId: string): void;
}

export class InMemoryPlayerCreationConversationStore implements PlayerCreationConversationStore {
  private readonly sessions = new Map<string, PlayerCreationSession>();

  get(telegramId: string): PlayerCreationSession | null {
    return this.sessions.get(telegramId) ?? null;
  }

  save(session: PlayerCreationSession): void {
    this.sessions.set(session.telegramId, session);
  }

  clear(telegramId: string): void {
    this.sessions.delete(telegramId);
  }
}
