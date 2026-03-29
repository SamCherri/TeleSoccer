import type { AuthUser, CreateAuthUserInput } from "../entities/auth-user.js";

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  create(input: CreateAuthUserInput): Promise<AuthUser>;
}
