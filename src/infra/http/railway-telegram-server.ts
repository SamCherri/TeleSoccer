import { AppEnv } from '../../config/env';
import { Phase1TelegramRuntime } from '../telegram/runtime';
import { TelegramBotApiClient } from '../telegram/client';
import { TelegramUpdate } from '../telegram/types';

const { createServer } = require('http') as {
  createServer: (handler: (request: HttpRequest, response: HttpResponse) => void | Promise<void>) => HttpServer;
};

interface HttpRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterableIterator<string>;
}

interface HttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

interface HttpServer {
  listen(port: number, host: string, callback: () => void): void;
  close(callback: (error?: Error | null) => void): void;
}

const readJsonBody = async <T>(request: HttpRequest): Promise<T> => {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
  }

  return (raw ? JSON.parse(raw) : {}) as T;
};

const respond = (response: HttpResponse, statusCode: number, body: string): void => {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
};

const normalizeHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const hasValidWebhookSecret = (request: HttpRequest, webhookSecret?: string): boolean => {
  if (!webhookSecret) {
    return true;
  }

  const headerValue = normalizeHeaderValue(request.headers?.['x-telegram-bot-api-secret-token']);
  return headerValue === webhookSecret;
};

export interface RailwayTelegramServerHandle {
  webhookPath: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export const createRailwayTelegramServer = (params: {
  env: AppEnv;
  runtime: Phase1TelegramRuntime;
  telegramClient: TelegramBotApiClient;
}): RailwayTelegramServerHandle => {
  const webhookSecret = params.env.TELEGRAM_WEBHOOK_SECRET ?? 'telesoccer-phase1';
  const webhookPath = `/telegram/webhook/${webhookSecret}`;
  let server: HttpServer | null = null;

  return {
    webhookPath,
    async start(): Promise<void> {
      server = createServer(async (request, response) => {
        if (!request.url) {
          respond(response, 404, 'not-found');
          return;
        }

        if (request.method === 'GET' && request.url === '/health') {
          respond(response, 200, 'ok');
          return;
        }

        if (request.method === 'POST' && request.url === webhookPath) {
          if (!hasValidWebhookSecret(request, params.env.TELEGRAM_WEBHOOK_SECRET)) {
            respond(response, 401, 'unauthorized');
            return;
          }

          try {
            const update = await readJsonBody<TelegramUpdate>(request);
            await params.runtime.processUpdate(update);
            respond(response, 200, 'accepted');
          } catch {
            respond(response, 400, 'invalid-json');
          }
          return;
        }

        respond(response, 404, 'not-found');
      });

      await new Promise<void>((resolve) => {
        server?.listen(params.env.PORT, '0.0.0.0', () => resolve());
      });

      if (params.env.APP_BASE_URL) {
        const baseUrl = params.env.APP_BASE_URL.replace(/\/$/, '');
        await params.telegramClient.setWebhook(`${baseUrl}${webhookPath}`, params.env.TELEGRAM_WEBHOOK_SECRET);
      }
    },
    async stop(): Promise<void> {
      if (!server) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server?.close((error?: Error | null) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      server = null;
    }
  };
};
