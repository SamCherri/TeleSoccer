import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import type { AuthUserRepository } from "../../domain/repositories/auth-user-repository.js";
import type { AuthSessionView, AuthUserView } from "../../shared/contracts/auth-contracts.js";

interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

type RegisterResult =
  | { ok: true; session: AuthSessionView }
  | { ok: false; error: "email-already-in-use" };

type LoginResult =
  | { ok: true; session: AuthSessionView }
  | { ok: false; error: "invalid-credentials" };

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

const toBase64Url = (value: string): string => Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const parsePasswordHash = (passwordHash: string): { salt: string; hash: string } | null => {
  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) {
    return null;
  }
  return { salt, hash };
};

const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, passwordHash: string): boolean => {
  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) {
    return false;
  }

  const hashedInput = scryptSync(password, parsed.salt, 64);
  const storedHash = Buffer.from(parsed.hash, "hex");

  if (storedHash.length !== hashedInput.length) {
    return false;
  }

  return timingSafeEqual(storedHash, hashedInput);
};

export class AuthApplicationService {
  private readonly tokenSecret: string;

  public constructor(private readonly userRepository: AuthUserRepository) {
    this.tokenSecret = process.env.AUTH_TOKEN_SECRET ?? "dev-insecure-token-secret";
  }

  public async register(input: RegisterInput): Promise<RegisterResult> {
    const email = normalizeEmail(input.email);
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      return { ok: false, error: "email-already-in-use" };
    }

    const created = await this.userRepository.create({
      email,
      displayName: input.displayName.trim(),
      passwordHash: hashPassword(input.password)
    });

    return { ok: true, session: this.buildSession(created.id, created.email, created.displayName) };
  }

  public async login(input: LoginInput): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const existing = await this.userRepository.findByEmail(email);

    if (!existing || !verifyPassword(input.password, existing.passwordHash)) {
      return { ok: false, error: "invalid-credentials" };
    }

    return { ok: true, session: this.buildSession(existing.id, existing.email, existing.displayName) };
  }

  public async resolveUserFromToken(token: string): Promise<AuthUserView | null> {
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      return null;
    }

    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  private buildSession(userId: string, email: string, displayName: string): AuthSessionView {
    const expiresAtDate = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
    const payload: TokenPayload = {
      sub: userId,
      email,
      exp: Math.floor(expiresAtDate.getTime() / 1000)
    };

    return {
      accessToken: this.signToken(payload),
      expiresAt: expiresAtDate.toISOString(),
      user: { id: userId, email, displayName }
    };
  }

  private signToken(payload: TokenPayload): string {
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = createHmac("sha256", this.tokenSecret).update(encodedPayload).digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload | null {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = createHmac("sha256", this.tokenSecret).update(encodedPayload).digest("base64url");
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    try {
      const parsed = JSON.parse(fromBase64Url(encodedPayload)) as TokenPayload;
      if (typeof parsed.exp !== "number" || typeof parsed.sub !== "string" || typeof parsed.email !== "string") {
        return null;
      }

      const nowEpoch = Math.floor(Date.now() / 1000);
      if (parsed.exp <= nowEpoch) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
