const path = require('path');
const { spawnSync } = require('child_process');
const {
  evaluateArtifactIntegrity,
  metadataPath,
  repoRoot
} = require('./build-utils.cjs');

const entryFile = path.join(repoRoot, 'dist', 'app', 'index.js');
const integrity = evaluateArtifactIntegrity();

if (!integrity.ok) {
  console.error('[startup-audit]', JSON.stringify({
    event: 'refusing-to-start-invalid-artifact',
    entryFile: path.relative(repoRoot, entryFile),
    metadataPath: path.relative(repoRoot, metadataPath),
    reasons: integrity.reasons,
    missingDistFiles: integrity.missingDistFiles,
    artifactStatus: integrity.artifactStatus,
    metadata: integrity.metadata
  }));
  process.exit(1);
}

process.env.TELESOCCER_DIST_STATUS = 'validated';
process.env.TELESOCCER_DIST_REASON = 'artifact-integrity-ok';

console.info('[startup-audit]', JSON.stringify({
  event: 'starting-compiled-app',
  entryFile: path.relative(repoRoot, entryFile),
  metadataPath: path.relative(repoRoot, metadataPath),
  distStatus: process.env.TELESOCCER_DIST_STATUS,
  distReason: process.env.TELESOCCER_DIST_REASON,
  buildScript: integrity.metadata?.buildScript ?? 'npm run build',
  builtAt: integrity.metadata?.builtAt ?? null,
  gitCommit: integrity.metadata?.gitCommit ?? null,
  appVersion: integrity.metadata?.appVersion ?? null,
  artifactStatus: integrity.artifactStatus
}));

const result = spawnSync(process.execPath, [entryFile], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
