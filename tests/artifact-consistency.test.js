const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.join(__dirname, '..');
const metadataPath = path.join(repoRoot, 'dist', 'build-meta.json');
const entryPath = path.join(repoRoot, 'dist', 'app', 'index.js');

const runNode = (script) => spawnSync(process.execPath, [script], {
  cwd: repoRoot,
  encoding: 'utf8',
  env: { ...process.env, DATABASE_URL: 'postgresql://test:test@localhost:5432/test' }
});

test('build registra inputHash e distHash no artefato', () => {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  assert.equal(typeof metadata.inputHash, 'string');
  assert.equal(metadata.inputHash.length > 10, true);
  assert.equal(typeof metadata.distHash, 'string');
  assert.equal(metadata.distHash.length > 10, true);
});

test('build registra auditoria de creates relacionais do Prisma em src e dist', () => {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const checks = metadata.artifactStatus?.checks ?? [];

  assert.equal(Array.isArray(checks), true);
  assert.equal(checks.length >= 5, true);
  assert.equal(checks.every((check) => check.srcHasSnippet && check.distHasSnippet && check.matches), true);
});

test('verify-artifact falha se src e dist divergirem', () => {
  const original = fs.readFileSync(entryPath, 'utf8');
  fs.writeFileSync(entryPath, `${original}\n// divergence injected by test\n`);
  try {
    const result = runNode(path.join('scripts', 'verify-artifact.cjs'));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /dist-hash-mismatch/);
  } finally {
    fs.writeFileSync(entryPath, original);
  }
});

test('start recusa subir dist inválido', () => {
  const original = fs.readFileSync(entryPath, 'utf8');
  fs.writeFileSync(entryPath, `${original}\n// invalid artifact injected by test\n`);
  try {
    const result = runNode(path.join('scripts', 'start.cjs'));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /refusing-to-start-invalid-artifact/);
  } finally {
    fs.writeFileSync(entryPath, original);
  }
});
