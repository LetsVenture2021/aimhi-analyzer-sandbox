import { resolve } from "node:path";
import { fetchBigQueryState } from "./gcp_fetch_bigquery";
import { fetchCloudBuildState } from "./gcp_fetch_cloud_build";
import { fetchCloudRunState } from "./gcp_fetch_cloud_run";
import { fetchDashboardsState } from "./gcp_fetch_dashboards";
import { fetchIamState } from "./gcp_fetch_iam";
import { fetchLoggingState } from "./gcp_fetch_logging";
import { fetchModelsState } from "./gcp_fetch_models";
import { fetchPipelinesState } from "./gcp_fetch_pipelines";
import { ensureDirectory, outputPath, parseCsvEnv, writeJsonFile } from "./gcp_utils";

export interface GcpStateIngestConfig {
  projectId: string;
  location: string;
  regions: string[];
  serviceAccounts: string[];
  bigQueryDatasets: string[];
  loggingSinks: string[];
  emitterScriptsPath?: string;
  emitterConfigsPath?: string;
  outputRoot: string;
}

export function defaultConfigFromEnv(): GcpStateIngestConfig {
  const outputRoot = resolve(process.env.GCP_STATE_OUTPUT_ROOT || outputPath(process.cwd(), "gcp-state"));
  return {
    projectId: process.env.GCP_PROJECT_ID || "",
    location: process.env.GCP_LOCATION || "us-central1",
    regions: parseCsvEnv(process.env.GCP_REGIONS).length > 0 ? parseCsvEnv(process.env.GCP_REGIONS) : [process.env.GCP_LOCATION || "us-central1"],
    serviceAccounts: parseCsvEnv(process.env.GCP_SERVICE_ACCOUNTS),
    bigQueryDatasets: parseCsvEnv(process.env.GCP_BQ_DATASETS),
    loggingSinks: parseCsvEnv(process.env.GCP_LOGGING_SINKS),
    emitterScriptsPath: process.env.GCP_EMITTER_SCRIPTS_PATH,
    emitterConfigsPath: process.env.GCP_EMITTER_CONFIGS_PATH,
    outputRoot
  };
}

export function ingestGcpState(config: GcpStateIngestConfig): unknown {
  ensureOutputStructure(config.outputRoot);
  const iam = fetchIamState({
    projectId: config.projectId,
    serviceAccounts: config.serviceAccounts,
    bigQueryDatasets: config.bigQueryDatasets,
    loggingSinks: config.loggingSinks,
    outputRoot: config.outputRoot
  });
  const bigquery = fetchBigQueryState({
    projectId: config.projectId,
    datasets: config.bigQueryDatasets,
    outputRoot: config.outputRoot
  });
  const logging = fetchLoggingState({ projectId: config.projectId, outputRoot: config.outputRoot });
  const cloudRun = fetchCloudRunState({
    projectId: config.projectId,
    regions: config.regions,
    outputRoot: config.outputRoot
  });
  const cloudBuild = fetchCloudBuildState({ projectId: config.projectId, outputRoot: config.outputRoot });
  const pipelines = fetchPipelinesState({
    projectId: config.projectId,
    location: config.location,
    outputRoot: config.outputRoot
  });
  const dashboards = fetchDashboardsState({ projectId: config.projectId, outputRoot: config.outputRoot });
  const models = fetchModelsState({
    projectId: config.projectId,
    location: config.location,
    outputRoot: config.outputRoot,
    emitterScriptsPath: config.emitterScriptsPath,
    emitterConfigsPath: config.emitterConfigsPath
  });

  const manifest = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    regions: config.regions,
    outputRoot: config.outputRoot,
    resources: { iam, bigquery, logging, cloudRun, cloudBuild, pipelines, dashboards, models }
  };
  writeJsonFile(outputPath(config.outputRoot, "manifest.json"), manifest);
  return manifest;
}

function ensureOutputStructure(outputRoot: string): void {
  const paths = [
    "iam",
    "bigquery",
    "logging",
    "cloud-run",
    "cloud-build",
    "pipelines",
    "dashboards",
    "models",
    "scripts"
  ];
  for (const pathSuffix of paths) {
    ensureDirectory(outputPath(outputRoot, pathSuffix));
  }
}

if (require.main === module) {
  const config = defaultConfigFromEnv();
  const result = ingestGcpState(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
