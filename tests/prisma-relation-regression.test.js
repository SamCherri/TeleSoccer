const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceFiles = {
  match: path.join(__dirname, '..', 'src', 'infra', 'prisma', 'match-repository.ts'),
  multiplayer: path.join(__dirname, '..', 'src', 'infra', 'prisma', 'multiplayer-repository.ts'),
  player: path.join(__dirname, '..', 'src', 'infra', 'prisma', 'player-repository.ts')
};

const read = (key) => fs.readFileSync(sourceFiles[key], 'utf8');

test('createMatchForPlayer e resolveTurn usam connect nas relações obrigatórias', () => {
  const source = read('match');
  assert.match(source, /player:\s*\{\s*connect:\s*\{\s*id:\s*params\.playerId\s*\}\s*\}/);
  assert.match(source, /homeClub:\s*\{\s*connect:\s*\{\s*id:\s*homeClub\.id\s*\}\s*\}/);
  assert.match(source, /awayClub:\s*\{\s*connect:\s*\{\s*id:\s*awayClub\.id\s*\}\s*\}/);
  assert.match(source, /match:\s*\{\s*connect:\s*\{\s*id:\s*matchId\s*\}\s*\}/);
  assert.match(source, /turn:\s*\{\s*connect:\s*\{\s*id:\s*resolution\.turnId\s*\}\s*\}/);
});

test('createSession multiplayer, joinSession e bot fallback usam connect nas relações obrigatórias', () => {
  const source = read('multiplayer');
  assert.match(source, /hostUser:\s*\{\s*connect:\s*\{\s*id:\s*input\.hostUserId\s*\}\s*\}/);
  assert.match(source, /session:\s*\{\s*connect:\s*\{\s*id:\s*createdSession\.id\s*\}\s*\}/);
  assert.match(source, /slot:\s*\{\s*connect:\s*\{\s*id:\s*hostSlot\.id\s*\}\s*\}/);
  assert.match(source, /user:\s*\{\s*connect:\s*\{\s*id:\s*input\.userId\s*\}\s*\}/);
  assert.match(source, /session:\s*\{\s*connect:\s*\{\s*id:\s*input\.sessionId\s*\}\s*\}/);
});

test('applyTraining e registerTryout usam connect nas relações obrigatórias', () => {
  const source = read('player');
  assert.match(source, /buildTrainingSessionCreateData\s*=\s*\([\s\S]*player:\s*\{\s*connect:\s*\{\s*id:\s*params\.playerId\s*\}\s*\}/);
  assert.match(source, /trainingSession\.create\([\s\S]*data:\s*buildTrainingSessionCreateData\(/);
  assert.match(source, /playerHistoryEntry\.create\([\s\S]*player:\s*\{\s*connect:\s*\{\s*id:\s*params\.playerId\s*\}\s*\}/);
  assert.match(source, /tryoutAttempt\.create\([\s\S]*player:\s*\{\s*connect:\s*\{\s*id:\s*params\.playerId\s*\}\s*\}/);
  assert.match(source, /clubMembership\.create\([\s\S]*club:\s*\{\s*connect:\s*\{\s*id:\s*params\.approvedClubId\s*\}\s*\}/);
});

test('auditoria textual não encontra FK crua perigosa em creates relacionais críticos de src/infra/prisma', () => {
  const checks = [
    { file: sourceFiles.match, scope: /tx\.matchTurn\.create\([\s\S]*?data:\s*\{([\s\S]*?)\n\s*\}\n\s*\}\);/ },
    { file: sourceFiles.match, scope: /tx\.matchEvent\.create\([\s\S]*?data:\s*\{([\s\S]*?)\n\s*\}\n\s*\}\);/ },
    { file: sourceFiles.multiplayer, scope: /multiplayerSessionParticipant\.create\([\s\S]*?data:\s*\{([\s\S]*?)\n\s*\}\n\s*\}\);/g },
    { file: sourceFiles.player, scope: /tryoutAttempt\.create\([\s\S]*?data:\s*\{([\s\S]*?)\n\s*\}\n\s*\}\);/ }
  ];

  for (const { file, scope } of checks) {
    const source = fs.readFileSync(file, 'utf8');
    const normalizedScope = scope.global ? scope : new RegExp(scope.source, `${scope.flags}g`);
    const matches = [...source.matchAll(normalizedScope)];
    assert.ok(matches.length > 0, `Nenhum bloco create capturado em ${path.basename(file)}`);
    for (const match of matches) {
      const body = match[1];
      assert.equal(/(^|\W)(playerId|matchId|turnId|sessionId|slotId|userId|clubId)\s*:/.test(body), false, `FK crua encontrada em ${path.basename(file)}`);
    }
  }
});
