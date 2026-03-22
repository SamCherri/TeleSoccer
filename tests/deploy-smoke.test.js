const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');

test('smoke de deploy inicia via scripts/start.cjs com artefato válido', () => {
  const result = spawnSync(process.execPath, [path.join('scripts', 'start.cjs')], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NODE_ENV: 'test',
      PORT: '3999',
      TELEGRAM_BOT_TOKEN: '',
      APP_BASE_URL: ''
    }
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /starting-compiled-app/);
  assert.match(result.stdout, /runtime-bootstrap/);
  assert.match(result.stdout, /Runtime Telegram desabilitado/);
});
