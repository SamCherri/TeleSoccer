export interface PrismaTransactionClient {
  user: {
    upsert(args: unknown): Promise<unknown>;
  };
  playerGeneration: {
    updateMany(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
  player: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  club: {
    upsert(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    findUnique(args: unknown): Promise<unknown>;
  };
  match: {
    findFirst(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  multiplayerSession: {
    findUnique(args: unknown): Promise<unknown>;
    findUniqueOrThrow(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  multiplayerSessionParticipant: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
  };
  matchTurn: {
    update(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
  matchEvent: {
    create(args: unknown): Promise<unknown>;
  };
  matchDisciplinaryEvent: {
    create(args: unknown): Promise<unknown>;
  };
  injuryRecord: {
    updateMany(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
  suspensionRecord: {
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  trainingSession: {
    findUnique(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
  playerAttribute: {
    update(args: unknown): Promise<unknown>;
  };
  wallet: {
    update(args: unknown): Promise<unknown>;
  };
  playerHistoryEntry: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    count(args: unknown): Promise<number>;
  };
  tryoutAttempt: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
  };
  clubMembership: {
    updateMany(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
  playerCreationConversation: {
    findUnique(args: unknown): Promise<unknown>;
    upsert(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
}

export interface PrismaClientLike extends PrismaTransactionClient {
  $transaction<T>(input: Promise<unknown>[] | ((tx: PrismaTransactionClient) => Promise<T>)): Promise<T>;
}

const loadPrismaClient = (): PrismaClientLike => {
  try {
    const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => PrismaClientLike };
    return new PrismaClient();
  } catch (error) {
    throw new Error(
      `@prisma/client não está disponível neste ambiente. Instale as dependências antes de usar os repositórios Prisma. Causa original: ${String(
        error
      )}`
    );
  }
};

let prismaInstance: PrismaClientLike | null = null;

export const getPrismaClient = (): PrismaClientLike => {
  prismaInstance ??= loadPrismaClient();
  return prismaInstance;
};

export const setPrismaClientForTests = (client: PrismaClientLike | null): void => {
  prismaInstance = client;
};
