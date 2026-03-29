import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { MatchApplicationService } from "../../application/services/match-application-service.js";
import { createMatchRepository } from "../../infra/repositories/create-match-repository.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerMatchRoutes } from "./routes/match-routes.js";

const DEFAULT_PRODUCTION_WEB_ORIGIN = "https://telesoccer-web-production.up.railway.app";
const LOCAL_WEB_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

const resolveAllowedOrigins = (): string[] => {
  const configuredOrigins = process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === "production") {
    return [DEFAULT_PRODUCTION_WEB_ORIGIN];
  }

  return [...LOCAL_WEB_ORIGINS, DEFAULT_PRODUCTION_WEB_ORIGIN];
};

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({ logger: true });
  const matchRepository = createMatchRepository();
  const matchService = new MatchApplicationService(matchRepository);

  await server.register(cors, {
    origin: resolveAllowedOrigins(),
    methods: ["GET", "POST", "OPTIONS"]
  });

  registerHealthRoutes(server);
  registerMatchRoutes(server, { matchService });

  return server;
};
