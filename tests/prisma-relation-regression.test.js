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

test('match repository mantém connect nas relações obrigatórias e FK explícita apenas onde o schema exige unchecked create', () => {
  const source = read('match');
  assert.match(source, /player:\s*\{\s*connect:\s*\{\s*id:\s*params\.playerId\s*\}\s*\}/);
  assert.match(source, /homeClub:\s*\{\s*connect:\s*\{\s*id:\s*homeClub\.id\s*\}\s*\}/);
  assert.match(source, /awayClub:\s*\{\s*connect:\s*\{\s*id:\s*awayClub\.id\s*\}\s*\}/);
  assert.match(source, /match:\s*\{\s*connect:\s*\{\s*id:\s*params\.matchId\s*\}\s*\}/);
  assert.match(source, /turn:\s*\{\s*connect:\s*\{\s*id:\s*params\.turnId\s*\}\s*\}/);
  assert.match(source, /matchId:\s*params\.matchId/);
  assert.doesNotMatch(source, /events:\s*\{\s*create:\s*\{/);
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
