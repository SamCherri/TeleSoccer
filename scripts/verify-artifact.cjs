const { evaluateArtifactIntegrity } = require('./build-utils.cjs');

const integrity = evaluateArtifactIntegrity();
const payload = {
  metadata: integrity.metadata,
  artifactStatus: integrity.artifactStatus,
  inputSummary: {
    latestMtimeMs: integrity.inputSummary.latestMtimeMs,
    inputHash: integrity.inputSummary.inputHash,
    trackedFileCount: integrity.inputSummary.files.length
  },
  distSummary: {
    latestMtimeMs: integrity.distSummary.latestMtimeMs,
    distHash: integrity.distSummary.distHash,
    distFileCount: integrity.distSummary.files.length
  },
  missingDistFiles: integrity.missingDistFiles,
  reasons: integrity.reasons,
  validation: {
    prismaMatchRelationConnectPresentInSrc: integrity.artifactStatus.srcHasFix,
    prismaMatchRelationConnectPresentInDist: integrity.artifactStatus.distHasFix,
    buildMetadataAvailable: Boolean(integrity.metadata),
    artifactIntegrityOk: integrity.ok
  }
};

console.info('[artifact-verify]', JSON.stringify(payload, null, 2));

if (!integrity.ok) {
  process.exit(1);
}
