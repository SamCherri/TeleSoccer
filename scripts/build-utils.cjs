const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const srcDir = path.join(repoRoot, 'src');
const prismaDir = path.join(repoRoot, 'prisma');
const scriptsDir = path.join(repoRoot, 'scripts');
const metadataPath = path.join(distDir, 'build-meta.json');
const packageJsonPath = path.join(repoRoot, 'package.json');
const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
const artifactChecks = [
  {
    key: 'matchCreateUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'match-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'match-repository.js'),
    needle: 'player: { connect: { id: params.playerId } }'
  },
  {
    key: 'matchEventUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'match-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'match-repository.js'),
    needle: 'turn: { connect: { id: resolution.turnId } }'
  },
  {
    key: 'matchTurnUsesExplicitForeignKey',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'match-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'match-repository.js'),
    needle: 'matchId: params.matchId'
  },
  {
    key: 'multiplayerSessionUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'multiplayer-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'multiplayer-repository.js'),
    needle: 'hostUser: { connect: { id: input.hostUserId } }'
  },
  {
    key: 'multiplayerParticipantUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'multiplayer-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'multiplayer-repository.js'),
    needle: 'session: { connect: { id: createdSession.id } }'
  },
  {
    key: 'playerGenerationUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'player-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'player-repository.js'),
    needle: 'user: { connect: { id: user.id } }'
  },
  {
    key: 'trainingSessionUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'player-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'player-repository.js'),
    needle: 'player: { connect: { id: params.playerId } }'
  },
  {
    key: 'tryoutUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'player-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'player-repository.js'),
    needle: "club: { connect: { id: params.approvedClubId } }"
  },
  {
    key: 'clubMembershipUsesConnect',
    srcPath: path.join(srcDir, 'infra', 'prisma', 'player-repository.ts'),
    distPath: path.join(distDir, 'infra', 'prisma', 'player-repository.js'),
    needle: 'club: { connect: { id: params.approvedClubId } }'
  }
];
const artifactNeedle = artifactChecks.find((check) => check.key === 'matchTurnUsesExplicitForeignKey').needle;
const requiredDistFiles = [
  path.join(distDir, 'app', 'index.js'),
  path.join(distDir, 'infra', 'http', 'railway-telegram-server.js'),
  path.join(distDir, 'infra', 'prisma', 'match-repository.js'),
  path.join(distDir, 'infra', 'prisma', 'multiplayer-repository.js'),
  path.join(distDir, 'infra', 'prisma', 'player-repository.js'),
  metadataPath
];

const walkFiles = (targetPath) => {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') return [];
      return walkFiles(entryPath);
    }
    return [entryPath];
  });
};

const getTrackedInputFiles = () => {
  return [
    ...walkFiles(srcDir).filter((file) => file.endsWith('.ts')),
    ...walkFiles(prismaDir).filter((file) => file.endsWith('.prisma') || file.endsWith('.sql') || file.endsWith('.toml')),
    ...walkFiles(scriptsDir).filter((file) => file.endsWith('.cjs')),
    packageJsonPath,
    tsconfigPath
  ].filter((file, index, array) => fs.existsSync(file) && array.indexOf(file) === index);
};

const computeHashForFiles = (files, baseDir = repoRoot) => {
  const hash = crypto.createHash('sha256');

  for (const file of [...files].sort()) {
    hash.update(path.relative(baseDir, file));
    hash.update('\n');
    hash.update(fs.readFileSync(file));
    hash.update('\n');
  }

  return hash.digest('hex');
};

const computeInputSummary = () => {
  const files = getTrackedInputFiles();
  const latestMtimeMs = files.reduce((max, file) => Math.max(max, fs.statSync(file).mtimeMs), 0);

  return {
    files,
    latestMtimeMs,
    inputHash: computeHashForFiles(files)
  };
};

const computeDistSummary = () => {
  const files = walkFiles(distDir).filter((file) => (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.d.ts')) && file !== metadataPath);
  const latestMtimeMs = files.reduce((max, file) => Math.max(max, fs.statSync(file).mtimeMs), 0);

  return {
    files,
    latestMtimeMs,
    distHash: files.length > 0 ? computeHashForFiles(files) : null
  };
};

const readPackageJson = () => JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const getGitCommit = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (_error) {
    return process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown';
  }
};

const readBuildMetadata = () => {
  if (!fs.existsSync(metadataPath)) return null;
  return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
};

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const getArtifactStatus = () => {
  const checks = artifactChecks.map((check) => {
    const srcHasSnippet = fs.existsSync(check.srcPath)
      ? fs.readFileSync(check.srcPath, 'utf8').includes(check.needle)
      : false;
    const distHasSnippet = fs.existsSync(check.distPath)
      ? fs.readFileSync(check.distPath, 'utf8').includes(check.needle)
      : false;

    return {
      key: check.key,
      srcPath: path.relative(repoRoot, check.srcPath),
      distPath: path.relative(repoRoot, check.distPath),
      expectedSnippet: check.needle,
      srcHasSnippet,
      distHasSnippet,
      matches: srcHasSnippet && distHasSnippet
    };
  });

  const matchTurnCheck = checks.find((check) => check.key === 'matchTurnUsesExplicitForeignKey');

  return {
    srcHasFix: Boolean(matchTurnCheck?.srcHasSnippet),
    distHasFix: Boolean(matchTurnCheck?.distHasSnippet),
    srcPath: matchTurnCheck?.srcPath,
    distPath: matchTurnCheck?.distPath,
    expectedSnippet: matchTurnCheck?.expectedSnippet ?? artifactNeedle,
    checks
  };
};

const evaluateArtifactIntegrity = () => {
  const metadata = readBuildMetadata();
  const inputSummary = computeInputSummary();
  const distSummary = computeDistSummary();
  const artifactStatus = getArtifactStatus();
  const missingDistFiles = requiredDistFiles
    .filter((file) => !fs.existsSync(file))
    .map((file) => path.relative(repoRoot, file));

  const reasons = [];
  if (missingDistFiles.length > 0) {
    reasons.push('missing-dist-files');
  }
  if (!metadata) {
    reasons.push('missing-build-metadata');
  }
  if (metadata && metadata.inputHash !== inputSummary.inputHash) {
    reasons.push('input-hash-mismatch');
  }
  if (metadata && Number(metadata.latestSourceMtimeMs) < inputSummary.latestMtimeMs) {
    reasons.push('source-newer-than-dist');
  }
  if (metadata && metadata.distHash && metadata.distHash !== distSummary.distHash) {
    reasons.push('dist-hash-mismatch');
  }
  if (!artifactStatus.srcHasFix || !artifactStatus.distHasFix) {
    reasons.push('prisma-match-connect-regression');
  }
  if (artifactStatus.checks.some((check) => !check.matches)) {
    reasons.push('prisma-relational-create-regression');
  }

  return {
    ok: reasons.length === 0,
    reasons,
    metadata,
    inputSummary,
    distSummary,
    artifactStatus,
    missingDistFiles
  };
};

module.exports = {
  artifactNeedle,
  computeDistSummary,
  computeInputSummary,
  distDir,
  ensureDir,
  evaluateArtifactIntegrity,
  getArtifactStatus,
  getGitCommit,
  metadataPath,
  readBuildMetadata,
  readPackageJson,
  repoRoot,
  requiredDistFiles
};
