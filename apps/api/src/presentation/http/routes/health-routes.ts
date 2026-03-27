import type { FastifyInstance } from "fastify";

export const registerHealthRoutes = (server: FastifyInstance): void => {
  server.get("/health", async () => ({
    data: { status: "ok", service: "telesoccer-api" },
    meta: {
      generatedAt: new Date().toISOString(),
      requestId: crypto.randomUUID()
    }
  }));
};
