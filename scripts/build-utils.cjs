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
const matchRepositorySrcPath = path.join(srcDir, 'infra', 'prisma', 'match-repository.ts');
const matchRepositoryDistPath = path.join(distDir, 'infra', 'prisma', 'match-repository.js');
const artifactNeedle = "match: { connect: { id: matchId } }";

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
    ...walkFiles(prismaDir).filter((file) => file.endsWith('.prisma')),
    ...walkFiles(scriptsDir).filter((file) => file.endsWith('.cjs')),
    packageJsonPath,
    tsconfigPath
  ].filter((file, index, array) => fs.existsSync(file) && array.indexOf(file) === index);
};

const computeInputSummary = () => {
  const files = getTrackedInputFiles();
  const latestMtimeMs = files.reduce((max, file) => Math.max(max, fs.statSync(file).mtimeMs), 0);
  const hash = crypto.createHash('sha256');

  for (const file of files.sort()) {
    hash.update(path.relative(repoRoot, file));
    hash.update('\n');
    hash.update(fs.readFileSync(file));
    hash.update('\n');
  }

  return {
    files,
    latestMtimeMs,
    inputHash: hash.digest('hex')
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
  const srcHasFix = fs.existsSync(matchRepositorySrcPath)
    ? fs.readFileSync(matchRepositorySrcPath, 'utf8').includes(artifactNeedle)
    : false;

  const distHasFix = fs.existsSync(matchRepositoryDistPath)
    ? fs.readFileSync(matchRepositoryDistPath, 'utf8').includes(artifactNeedle)
    : false;

  return {
    srcHasFix,
    distHasFix,
    srcPath: path.relative(repoRoot, matchRepositorySrcPath),
    distPath: path.relative(repoRoot, matchRepositoryDistPath),
    expectedSnippet: artifactNeedle
  };
};

module.exports = {
  computeInputSummary,
  distDir,
  ensureDir,
  getArtifactStatus,
  getGitCommit,
  metadataPath,
  readBuildMetadata,
  readPackageJson,
  repoRoot
};
