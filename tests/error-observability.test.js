const test = require('node:test');
const assert = require('node:assert/strict');

const { Phase1TelegramRuntime } = require('../dist/infra/telegram/runtime.js');
const { TelegramBotApiClient } = require('../dist/infra/telegram/client.js');

const withCapturedConsole = async (callback) => {
  const originalInfo = console.info;
  const originalError = console.error;
  const info = [];
  const error = [];
  console.info = (...args) => info.push(args.join(' '));
  console.error = (...args) => error.push(args.join(' '));
  try {
    await callback({ info, error });
  } finally {
    console.info = originalInfo;
    console.error = originalError;
  }
};

test('runtime propaga falha de sendMessage e loga contexto mínimo', async () => {
  await withCapturedConsole(async ({ error }) => {
    const runtime = new Phase1TelegramRuntime(
      {
        dispatch: async () => ({ text: 'ok', actions: [] })
      },
      {
        sendMessage: async () => { throw new Error('send failed'); },
        sendDocument: async () => { throw new Error('send document failed'); },
        sendPhoto: async () => { throw new Error('send photo failed'); },
        setWebhook: async () => {},
        getWebhookInfo: async () => ({}),
        deleteWebhook: async () => {}
      }
    );

    await assert.rejects(
      runtime.processUpdate({
        update_id: 987,
        message: {
          message_id: 1,
          date: 1710000000,
          text: '/START@TeleSoccerBot',
          chat: { id: 654, type: 'private' },
          from: { id: 321, is_bot: false, first_name: 'QA' }
        }
      }),
      /send failed/
    );

    const combined = error.join('\n');
    assert.match(combined, /process-update-failed/);
    assert.match(combined, /"updateId":987/);
    assert.match(combined, /"chatId":654/);
    assert.match(combined, /"fromId":321/);
    assert.match(combined, /"command":"\/START@TeleSoccerBot"/);
  });
});

test('Telegram client gera logs estruturados para sendMessage com contexto de chat', async () => {
  await withCapturedConsole(async ({ info }) => {
    const client = new TelegramBotApiClient('token', async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: { message_id: 10 } })
    }));

    await client.sendMessage({ chat_id: 999, text: 'observability test' });

    const combined = info.join('\n');
    assert.match(combined, /send-message-start/);
    assert.match(combined, /send-message-success/);
    assert.match(combined, /"chatId":999/);
    assert.match(combined, /"textLength":18/);
  });
});
