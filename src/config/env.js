export function readEnv(env = process.env) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isFinite(port) || port <= 0) throw new Error("PORT inválida");

  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port,
    storageDriver: env.STORAGE_DRIVER === "prisma" ? "prisma" : "memory"
  };
}
