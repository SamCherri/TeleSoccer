import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuthApplicationService } from "../../../application/services/auth-application-service.js";

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const response = <T>(data: T) => ({
  data,
  meta: {
    generatedAt: new Date().toISOString(),
    requestId: crypto.randomUUID()
  }
});

const extractBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const registerAuthRoutes = (
  server: FastifyInstance,
  dependencies: { authService: AuthApplicationService }
): void => {
  const { authService } = dependencies;

  server.post("/auth/register", async (request, reply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const result = await authService.register(parse.data);
    if (!result.ok) {
      return reply.status(409).send(response({ error: result.error }));
    }

    return reply.status(201).send(response({ session: result.session }));
  });

  server.post("/auth/login", async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send(response({ error: parse.error.flatten() }));
    }

    const result = await authService.login(parse.data);
    if (!result.ok) {
      return reply.status(401).send(response({ error: result.error }));
    }

    return response({ session: result.session });
  });

  server.get("/auth/me", async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.status(401).send(response({ error: "missing-bearer-token" }));
    }

    const user = await authService.resolveUserFromToken(token);
    if (!user) {
      return reply.status(401).send(response({ error: "invalid-or-expired-token" }));
    }

    return response({ user });
  });
};
