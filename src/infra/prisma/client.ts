export interface PrismaTransactionClient {
  user: {
    upsert(args: unknown): Promise<any>;
  };
  playerGeneration: {
    updateMany(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<any>;
  };
  player: {
    create(args: unknown): Promise<any>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  club: {
    upsert(args: unknown): Promise<any>;
    findMany(args: unknown): Promise<any[]>;
  };
  trainingSession: {
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
  };
  playerAttribute: {
    update(args: unknown): Promise<any>;
  };
  wallet: {
    update(args: unknown): Promise<any>;
  };
  playerHistoryEntry: {
    create(args: unknown): Promise<any>;
    createMany(args: unknown): Promise<any>;
  };
  tryoutAttempt: {
    create(args: unknown): Promise<any>;
  };
  clubMembership: {
    updateMany(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
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
