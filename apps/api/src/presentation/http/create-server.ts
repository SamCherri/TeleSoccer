import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMatchRoutes } from './routes/match-routes.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await registerMatchRoutes(app);

  return app;
}
