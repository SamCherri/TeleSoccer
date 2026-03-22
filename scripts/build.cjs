const fs = require('fs');
const { execFileSync } = require('child_process');
const {
  computeInputSummary,
  distDir,
  ensureDir,
  getArtifactStatus,
  getGitCommit,
  metadataPath,
  readPackageJson,
  repoRoot
} = require('./build-utils.cjs');

const packageJson = readPackageJson();
const inputSummary = computeInputSummary();

fs.rmSync(distDir, { recursive: true, force: true });
ensureDir(distDir);

execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsc', '-p', 'tsconfig.json'], {
  cwd: repoRoot,
  stdio: 'inherit'
});

const artifactStatus = getArtifactStatus();
const metadata = {
  appVersion: packageJson.version,
  gitCommit: getGitCommit(),
  buildScript: 'npm run build',
  startScript: 'npm run start',
  startEntrypoint: 'dist/app/index.js',
  builtAt: new Date().toISOString(),
  latestSourceMtimeMs: inputSummary.latestMtimeMs,
  inputHash: inputSummary.inputHash,
  artifactStatus
};

fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
console.info('[build-audit]', JSON.stringify({ event: 'build-complete', metadata }));

if (!artifactStatus.srcHasFix || !artifactStatus.distHasFix) {
  console.error('[build-audit]', JSON.stringify({ event: 'artifact-validation-failed', artifactStatus }));
  process.exitCode = 1;
}
