const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  computeInputSummary,
  distDir,
  getArtifactStatus,
  metadataPath,
  readBuildMetadata,
  repoRoot
} = require('./build-utils.cjs');

const entryFile = path.join(repoRoot, 'dist', 'app', 'index.js');

const runBuild = (reason) => {
  console.info('[startup-audit]', JSON.stringify({ event: 'build-required', reason, buildScript: 'npm run build' }));
  const result = spawnSync(process.execPath, [path.join(__dirname, 'build.cjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  process.env.TELESOCCER_DIST_STATUS = 'rebuilt';
  process.env.TELESOCCER_DIST_REASON = reason;
};

const currentInputs = computeInputSummary();
let metadata = readBuildMetadata();
let reason = null;

if (!fs.existsSync(distDir) || !fs.existsSync(entryFile) || !metadata) {
  reason = 'missing-dist-artifact';
} else if (metadata.inputHash !== currentInputs.inputHash) {
  reason = 'input-hash-mismatch';
} else if (Number(metadata.latestSourceMtimeMs) < currentInputs.latestMtimeMs) {
  reason = 'source-newer-than-dist';
}

if (reason) {
  runBuild(reason);
  metadata = readBuildMetadata();
} else {
  process.env.TELESOCCER_DIST_STATUS = 'fresh';
  process.env.TELESOCCER_DIST_REASON = 'metadata-up-to-date';
}

const artifactStatus = getArtifactStatus();
console.info('[startup-audit]', JSON.stringify({
  event: 'starting-compiled-app',
  entryFile: path.relative(repoRoot, entryFile),
  metadataPath: path.relative(repoRoot, metadataPath),
  distStatus: process.env.TELESOCCER_DIST_STATUS,
  distReason: process.env.TELESOCCER_DIST_REASON,
  buildScript: metadata?.buildScript ?? 'npm run build',
  builtAt: metadata?.builtAt ?? null,
  gitCommit: metadata?.gitCommit ?? null,
  appVersion: metadata?.appVersion ?? null,
  artifactStatus
}));

if (!artifactStatus.srcHasFix || !artifactStatus.distHasFix) {
  console.error('[startup-audit]', JSON.stringify({ event: 'refusing-to-start-stale-artifact', artifactStatus }));
  process.exit(1);
}

const result = spawnSync(process.execPath, [entryFile], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
