import { buildContainer } from './container';
import { loadEnv } from '../config/env';
import { TelegramBotApiClient } from '../infra/telegram/client';
import { Phase1TelegramRuntime } from '../infra/telegram/runtime';
import { createRailwayTelegramServer } from '../infra/http/railway-telegram-server';

export const bootstrap = () => {
  const env = loadEnv();
  const container = buildContainer();

  return {
    env,
    container
  };
};

export const start = async () => {
  const { env, container } = bootstrap();

  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log(`TeleSoccer Fase 2 carregado em modo ${env.NODE_ENV}. Runtime Telegram desabilitado: TELEGRAM_BOT_TOKEN não configurado.`);
    return null;
  }

  const telegramClient = new TelegramBotApiClient(env.TELEGRAM_BOT_TOKEN);
  const runtime = new Phase1TelegramRuntime(container.phase1TelegramDispatcher, telegramClient);
  const server = createRailwayTelegramServer({ env, runtime, telegramClient });
  await server.start();

  console.log(`TeleSoccer Fase 2 ouvindo na porta ${env.PORT} com webhook ${server.webhookPath}.`);
  return server;
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Falha ao iniciar o TeleSoccer Fase 2.', error);
    process.exitCode = 1;
  });
}
