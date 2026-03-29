import { createServer } from "./presentation/http/create-server.js";

const bootstrap = async (): Promise<void> => {
  const server = await createServer();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  server.log.info({ host, port }, "[teleSoccer-api] listen-config");

  await server.listen({ port, host });
};

bootstrap().catch((error) => {
  console.error("[teleSoccer-api] bootstrap-failed", error);
  process.exit(1);
});
