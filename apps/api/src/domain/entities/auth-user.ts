export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAuthUserInput {
  email: string;
  displayName: string;
  passwordHash: string;
}
