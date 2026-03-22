import fs from 'fs';
import path from 'path';
import { buildContainer } from './container';
import { loadEnv } from '../config/env';
import { TelegramBotApiClient } from '../infra/telegram/client';
import { Phase1TelegramRuntime } from '../infra/telegram/runtime';
import { createRailwayTelegramServer } from '../infra/http/railway-telegram-server';

interface BuildMetadata {
  appVersion?: string;
  gitCommit?: string;
  buildScript?: string;
  startScript?: string;
  startEntrypoint?: string;
  builtAt?: string;
  latestSourceMtimeMs?: number;
  inputHash?: string;
  artifactStatus?: {
    srcHasFix?: boolean;
    distHasFix?: boolean;
    srcPath?: string;
    distPath?: string;
    expectedSnippet?: string;
  };
}

const readBuildMetadata = (): BuildMetadata | null => {
  const metadataPath = path.resolve(__dirname, '..', 'build-meta.json');
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as BuildMetadata;
};

const logStartupAudit = () => {
  const metadata = readBuildMetadata();

  console.info(
    '[startup-runtime]',
    JSON.stringify({
      event: 'runtime-bootstrap',
      commit: metadata?.gitCommit ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? 'unknown',
      version: metadata?.appVersion ?? 'unknown',
      buildScript: metadata?.buildScript ?? 'unknown',
      startScript: metadata?.startScript ?? process.env.npm_lifecycle_event ?? 'unknown',
      realEntryFile: __filename,
      builtAt: metadata?.builtAt ?? null,
      distStatus: process.env.TELESOCCER_DIST_STATUS ?? 'unknown',
      distReason: process.env.TELESOCCER_DIST_REASON ?? 'unknown',
      distRecompiled: process.env.TELESOCCER_DIST_STATUS === 'rebuilt',
      artifactValidation: metadata?.artifactStatus ?? null
    })
  );
};

export const bootstrap = () => {
  const env = loadEnv();
  const container = buildContainer();

  return {
    env,
    container
  };
};

export const start = async () => {
  logStartupAudit();

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
