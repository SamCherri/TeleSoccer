import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { MatchApplicationService } from "../../application/services/match-application-service.js";
import { createMatchRepository } from "../../infra/repositories/create-match-repository.js";
import { createAuthUserRepository } from "../../infra/repositories/create-auth-user-repository.js";
import { AuthApplicationService } from "../../application/services/auth-application-service.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerMatchRoutes } from "./routes/match-routes.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";

const LOCAL_WEB_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

const resolveAllowedOrigins = (): string[] => {
  const configuredOrigins = process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGIN não configurado em produção.");
  }

  return LOCAL_WEB_ORIGINS;
};

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({ logger: true });
  const allowedOrigins = resolveAllowedOrigins();

  server.log.info(
    {
      nodeEnv: process.env.NODE_ENV ?? "undefined",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      allowedOrigins
    },
    "[teleSoccer-api] startup-config"
  );

  const matchRepository = createMatchRepository();
  const authUserRepository = createAuthUserRepository();

  const matchService = new MatchApplicationService(matchRepository);
  const authService = new AuthApplicationService(authUserRepository);

  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin não permitida: ${origin}`), false);
    },
    methods: ["GET", "POST", "OPTIONS"]
  });

  registerHealthRoutes(server);
  registerAuthRoutes(server, { authService });
  registerMatchRoutes(server, { matchService });

  return server;
};
