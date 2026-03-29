import type { MatchRepository } from "../../domain/repositories/match-repository.js";
import { getPrismaClient } from "../prisma/prisma-client.js";
import { InMemoryMatchRepository } from "./in-memory-match-repository.js";
import { PrismaMatchRepository } from "./prisma-match-repository.js";

export const createMatchRepository = (): MatchRepository => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production environment");
  }

  if (!process.env.DATABASE_URL) {
    return new InMemoryMatchRepository();
  }

  const prisma = getPrismaClient();
  return new PrismaMatchRepository(prisma);
};
