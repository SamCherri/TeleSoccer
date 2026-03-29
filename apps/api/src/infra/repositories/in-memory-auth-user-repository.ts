import { randomUUID } from "node:crypto";
import type { AuthUser, CreateAuthUserInput } from "../../domain/entities/auth-user.js";
import type { AuthUserRepository } from "../../domain/repositories/auth-user-repository.js";

export class InMemoryAuthUserRepository implements AuthUserRepository {
  private readonly users = new Map<string, AuthUser>();
  private readonly usersByEmail = new Map<string, AuthUser>();

  public async findByEmail(email: string): Promise<AuthUser | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  public async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  public async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const createdAt = new Date();
    const user: AuthUser = {
      id: randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt,
      updatedAt: createdAt
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }
}
