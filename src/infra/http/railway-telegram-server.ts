import { AppEnv } from '../../config/env';
import { Phase1TelegramRuntime } from '../telegram/runtime';
import { TelegramBotApiClient } from '../telegram/client';
import { isTelegramUpdate, TelegramUpdate } from '../telegram/types';

interface HttpRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterableIterator<string | Uint8Array>;
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

const { createServer } = require('http') as {
  createServer: (handler: (request: HttpRequest, response: HttpResponse) => void | Promise<void>) => HttpServer;
};

const textDecoder = new TextDecoder();

class InvalidJsonError extends Error {
  constructor(message = 'Falha ao fazer parse do JSON do webhook do Telegram.') {
    super(message);
    this.name = 'InvalidJsonError';
  }
}

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Erro não identificado',
    value: error
  };
};

const logAudit = (event: string, details: Record<string, unknown>): void => {
  console.info('[railway-telegram-server]', JSON.stringify({ event, ...details }));
};

const logFailure = (event: string, details: Record<string, unknown>, error: unknown): void => {
  console.error('[railway-telegram-server]', JSON.stringify({ event, ...details, error: serializeError(error) }));
};

const readJsonBody = async (request: HttpRequest): Promise<unknown> => {
  let raw = '';

  for await (const chunk of request) {
    raw += typeof chunk === 'string' ? chunk : textDecoder.decode(chunk, { stream: true });
  }

  raw += textDecoder.decode();
  const normalized = raw.trim();

  try {
    return normalized ? JSON.parse(normalized) : {};
  } catch (error) {
    throw new InvalidJsonError(error instanceof Error ? error.message : undefined);
  }
};

const respond = (response: HttpResponse, statusCode: number, body: string): void => {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
};

const respondJson = (response: HttpResponse, statusCode: number, body: Record<string, unknown>): void => {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
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

  const headerValue = normalizeHeaderValue(request.headers['x-telegram-bot-api-secret-token']);
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
      server = createServer(async (request: HttpRequest, response: HttpResponse) => {
        const requestMethod = request.method ?? 'UNKNOWN';
        const requestUrl = request.url ?? '';

        logAudit('request-received', {
          method: requestMethod,
          url: requestUrl
        });

        if (!request.url) {
          respond(response, 404, 'not-found');
          return;
        }

        if (request.method === 'GET' && request.url === '/health') {
          respond(response, 200, 'ok');
          return;
        }

        if (request.method === 'GET' && request.url === '/debug/telegram-runtime') {
          respondJson(response, 200, {
            nodeEnv: params.env.NODE_ENV,
            hasTelegramBotToken: Boolean(params.env.TELEGRAM_BOT_TOKEN),
            hasAppBaseUrl: Boolean(params.env.APP_BASE_URL),
            hasWebhookSecret: Boolean(params.env.TELEGRAM_WEBHOOK_SECRET),
            webhookPath
          });
          return;
        }

        if (request.method === 'POST' && request.url === webhookPath) {
          const secretIsValid = hasValidWebhookSecret(request, params.env.TELEGRAM_WEBHOOK_SECRET);
          logAudit('webhook-secret-validated', {
            method: requestMethod,
            url: requestUrl,
            secretIsValid
          });

          if (!secretIsValid) {
            respond(response, 401, 'unauthorized');
            return;
          }

          let payload: unknown;
          try {
            payload = await readJsonBody(request);
          } catch (error) {
            logFailure('webhook-json-parse-failed', {
              method: requestMethod,
              url: requestUrl
            }, error);
            respond(response, 400, 'invalid-json');
            return;
          }

          const payloadIsValid = isTelegramUpdate(payload);
          logAudit('webhook-payload-validated', {
            method: requestMethod,
            url: requestUrl,
            payloadIsValid
          });

          if (!payloadIsValid) {
            respond(response, 400, 'invalid-payload');
            return;
          }

          const telegramUpdate = payload as TelegramUpdate;

          try {
            logAudit('runtime-process-update-start', {
              method: requestMethod,
              url: requestUrl,
              updateId: telegramUpdate.update_id
            });
            const processed = await params.runtime.processUpdate(telegramUpdate);
            logAudit('runtime-process-update-finish', {
              method: requestMethod,
              url: requestUrl,
              updateId: telegramUpdate.update_id,
              processed
            });
            respond(response, processed ? 200 : 202, processed ? 'accepted' : 'ignored');
          } catch (error) {
            logFailure('runtime-process-update-failed', {
              method: requestMethod,
              url: requestUrl,
              updateId: telegramUpdate.update_id
            }, error);
            respond(response, 500, 'processing-error');
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
