import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { MatchApplicationService } from "../../application/services/match-application-service.js";
import { createMatchRepository } from "../../infra/repositories/create-match-repository.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerMatchRoutes } from "./routes/match-routes.js";

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
  const matchRepository = createMatchRepository();
  const matchService = new MatchApplicationService(matchRepository);
  const allowedOrigins = resolveAllowedOrigins();

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
  registerMatchRoutes(server, { matchService });

  return server;
};
