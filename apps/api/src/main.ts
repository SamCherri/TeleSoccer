import { createServer } from './presentation/http/create-server.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = await createServer();
await app.listen({ port: PORT, host: HOST });
