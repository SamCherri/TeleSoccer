import type { PrismaClient } from "@prisma/client";
import type { AuthUser, CreateAuthUserInput } from "../../domain/entities/auth-user.js";
import type { AuthUserRepository } from "../../domain/repositories/auth-user-repository.js";

const toDomain = (user: {
  id: string;
  email: string | null;
  displayName: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthUser | null => {
  if (!user.email || !user.passwordHash) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

export class PrismaAuthUserRepository implements AuthUserRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    return toDomain(user);
  }

  public async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return null;
    }

    return toDomain(user);
  }

  public async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash
      }
    });

    const mapped = toDomain(user);
    if (!mapped) {
      throw new Error("Usuário criado sem email/passwordHash válidos");
    }

    return mapped;
  }
}
