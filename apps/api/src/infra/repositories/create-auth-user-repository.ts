import type { AuthUserRepository } from "../../domain/repositories/auth-user-repository.js";
import { getPrismaClient } from "../prisma/prisma-client.js";
import { InMemoryAuthUserRepository } from "./in-memory-auth-user-repository.js";
import { PrismaAuthUserRepository } from "./prisma-auth-user-repository.js";

export const createAuthUserRepository = (): AuthUserRepository => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production environment");
  }

  if (!process.env.DATABASE_URL) {
    return new InMemoryAuthUserRepository();
  }

  const prisma = getPrismaClient();
  return new PrismaAuthUserRepository(prisma);
};
