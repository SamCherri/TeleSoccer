const { getArtifactStatus, readBuildMetadata } = require('./build-utils.cjs');

const metadata = readBuildMetadata();
const artifactStatus = getArtifactStatus();
const payload = {
  metadata,
  artifactStatus,
  validation: {
    prismaMatchRelationConnectPresentInSrc: artifactStatus.srcHasFix,
    prismaMatchRelationConnectPresentInDist: artifactStatus.distHasFix,
    buildMetadataAvailable: Boolean(metadata)
  }
};

console.info('[artifact-verify]', JSON.stringify(payload, null, 2));

if (!artifactStatus.srcHasFix || !artifactStatus.distHasFix || !metadata) {
  process.exit(1);
}
