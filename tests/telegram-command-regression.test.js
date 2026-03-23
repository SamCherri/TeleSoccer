const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { Phase1TelegramDispatcher } = require('../dist/bot/phase1-dispatcher.js');
const { createRailwayTelegramServer, buildFinalWebhookUrl } = require('../dist/infra/http/railway-telegram-server.js');

const createFacadeStub = () => ({
  handleEntry: async (telegramId) => ({ text: `entry:${telegramId}`, actions: [] }),
  handleCreatePlayer: async () => ({ text: 'create-player', actions: [] }),
  handlePlayerCard: async () => ({ text: 'card', actions: [] }),
  handleCareerStatus: async () => ({ text: 'status', actions: [] }),
  handleCareerHistory: async () => ({ text: 'history', actions: [] }),
  handleWalletStatement: async () => ({ text: 'wallet', actions: [] }),
  handleTrainingMenu: async () => ({ text: 'training', actions: [] }),
  handleWeekAgenda: async () => ({ text: 'agenda', actions: [] }),
  handleLockerRoom: async () => ({ text: 'locker', actions: [] }),
  handleInvitations: async () => ({ text: 'invites', actions: [] }),
  handleTryoutPrompt: async () => ({ text: 'tryout', actions: [] }),
  handleTryout: async () => ({ text: 'confirm-tryout', actions: [] }),
  handleStartMatch: async () => ({ text: 'start-match', actions: [] }),
  handleCurrentMatch: async () => ({ text: 'current-match', actions: [] }),
  handleMatchAction: async () => ({ text: 'match-action', actions: [] }),
  handleCreateSession: async () => ({ text: 'create-session', actions: [] }),
  handleCurrentSession: async () => ({ text: 'current-session', actions: [] }),
  handlePrepareSession: async () => ({ text: 'prepare-session', actions: [] }),
  handleWeeklyTraining: async () => ({ text: 'weekly-training', actions: [] }),
  handleJoinSession: async () => ({ text: 'join-session', actions: [] })
});

const createCreationFlowStub = () => ({
  expireIfNeeded: async () => null,
  isActive: async () => false,
  start: async () => ({ text: 'creation-start', actions: [] })
});

const createUpdate = (text) => ({
  update_id: 777,
  message: {
    message_id: 9,
    date: 1710000000,
    text,
    chat: { id: 456, type: 'private' },
    from: { id: 123, is_bot: false, first_name: 'Tester' }
  }
});

const requestJson = (port, path, body, headers = {}) => new Promise((resolve, reject) => {
  const req = http.request({ port, host: '127.0.0.1', method: 'POST', path, headers }, (res) => {
    let raw = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => resolve({ statusCode: res.statusCode, body: raw, headers: res.headers }));
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

const requestText = (port, path) => new Promise((resolve, reject) => {
  http.get({ port, host: '127.0.0.1', path }, (res) => {
    let raw = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => resolve({ statusCode: res.statusCode, body: raw, headers: res.headers }));
  }).on('error', reject);
});

test('dispatcher normaliza /start em diferentes caixas e menção ao bot', async () => {
  const dispatcher = new Phase1TelegramDispatcher(createFacadeStub(), createCreationFlowStub());

  for (const command of ['/start', '/Start', '/START', '/start@TeleSoccerBot', '/START@TeleSoccerBot']) {
    const reply = await dispatcher.dispatch({ telegramId: 'tg-1', text: command });
    assert.equal(reply.text, 'entry:tg-1');
  }
});

test('buildFinalWebhookUrl normaliza base e path do webhook', () => {
  assert.equal(buildFinalWebhookUrl('https://tele.example.com/', 'telegram/webhook/abc'), 'https://tele.example.com/telegram/webhook/abc');
  assert.equal(buildFinalWebhookUrl(undefined, '/telegram/webhook/abc'), undefined);
});

test('webhook responde 400 para invalid-json, 401 para secret inválido e 500 para erro interno real', async (t) => {
  let shouldThrow = false;
  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
      PORT: 33101,
      APP_BASE_URL: 'https://tele.example.com',
      TELEGRAM_WEBHOOK_SECRET: 'secret-123',
      TELEGRAM_BOT_TOKEN: 'token'
    },
    runtime: {
      processUpdate: async () => {
        if (shouldThrow) throw new Error('runtime exploded');
        return true;
      }
    },
    telegramClient: {
      setWebhook: async () => {},
      getWebhookInfo: async () => ({ url: 'https://tele.example.com/telegram/webhook/secret-123' }),
      deleteWebhook: async () => {},
      sendMessage: async () => {},
      sendDocument: async () => {},
      sendPhoto: async () => {}
    }
  });

  await server.start();
  t.after(async () => { await server.stop(); });

  const invalidJson = await requestJson(33101, server.webhookPath, '{bad json', {
    'content-type': 'application/json',
    'x-telegram-bot-api-secret-token': 'secret-123'
  });
  assert.equal(invalidJson.statusCode, 400);
  assert.equal(invalidJson.body, 'invalid-json');

  const unauthorized = await requestJson(33101, server.webhookPath, JSON.stringify(createUpdate('/start')), {
    'content-type': 'application/json',
    'x-telegram-bot-api-secret-token': 'wrong-secret'
  });
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.body, 'unauthorized');

  shouldThrow = true;
  const internalError = await requestJson(33101, server.webhookPath, JSON.stringify(createUpdate('/start')), {
    'content-type': 'application/json',
    'x-telegram-bot-api-secret-token': 'secret-123'
  });
  assert.equal(internalError.statusCode, 500);
  assert.equal(internalError.body, 'processing-error');
});

test('debug webhook info mostra mismatch entre URL registrada e finalWebhookUrl', async (t) => {
  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
      PORT: 33102,
      APP_BASE_URL: 'https://public.tele.example.com',
      TELEGRAM_WEBHOOK_SECRET: 'secret-456',
      TELEGRAM_BOT_TOKEN: 'token'
    },
    runtime: { processUpdate: async () => true },
    telegramClient: {
      setWebhook: async () => {},
      getWebhookInfo: async () => ({ url: 'https://staging.tele.example.com/telegram/webhook/secret-456' }),
      deleteWebhook: async () => {},
      sendMessage: async () => {},
      sendDocument: async () => {},
      sendPhoto: async () => {}
    }
  });

  await server.start();
  t.after(async () => { await server.stop(); });

  const response = await requestText(33102, '/debug/telegram-webhook-info');
  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.finalWebhookUrl, 'https://public.tele.example.com/telegram/webhook/secret-456');
  assert.equal(payload.registeredWebhookUrl, 'https://staging.tele.example.com/telegram/webhook/secret-456');
  assert.equal(payload.urlsMatch, false);
});

test('webhook mantém PrismaClientValidationError como erro interno real, sem cair em invalid-json', async (t) => {
  const server = createRailwayTelegramServer({
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
      PORT: 33103,
      APP_BASE_URL: 'https://tele.example.com',
      TELEGRAM_WEBHOOK_SECRET: 'secret-prisma',
      TELEGRAM_BOT_TOKEN: 'token'
    },
    runtime: {
      processUpdate: async () => {
        const error = new Error('Argument "match" is missing');
        error.name = 'PrismaClientValidationError';
        throw error;
      }
    },
    telegramClient: {
      setWebhook: async () => {},
      getWebhookInfo: async () => ({ url: 'https://tele.example.com/telegram/webhook/secret-prisma' }),
      deleteWebhook: async () => {},
      sendMessage: async () => {},
      sendDocument: async () => {},
      sendPhoto: async () => {}
    }
  });

  await server.start();
  t.after(async () => { await server.stop(); });

  const response = await requestJson(33103, server.webhookPath, JSON.stringify(createUpdate('/start')), {
    'content-type': 'application/json',
    'x-telegram-bot-api-secret-token': 'secret-prisma'
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.body, 'processing-error');
});
