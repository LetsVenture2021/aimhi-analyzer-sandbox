import { outputPath, readJsonCommand, writeJsonFile } from "./gcp_utils";

export interface CloudBuildFetchConfig {
  projectId: string;
  outputRoot: string;
}

export function fetchCloudBuildState(config: CloudBuildFetchConfig): unknown {
  const cloudBuildRoot = outputPath(config.outputRoot, "cloud-build");
  const triggers = readJsonCommand(`gcloud builds triggers list --project=${config.projectId} --format=json`);
  const history = readJsonCommand(`gcloud builds list --project=${config.projectId} --limit=100 --format=json`);

  writeJsonFile(outputPath(cloudBuildRoot, "build-triggers.json"), triggers);
  writeJsonFile(outputPath(cloudBuildRoot, "build-history.json"), history);

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    buildTriggers: triggers,
    buildHistory: history
  };
  writeJsonFile(outputPath(cloudBuildRoot, "cloud-build-index.json"), summary);
  return summary;
}
