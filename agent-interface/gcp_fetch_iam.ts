import { outputPath, parseCsvEnv, readJsonCommand, safeName, writeJsonFile } from "./gcp_utils";

export interface IamFetchConfig {
  projectId: string;
  serviceAccounts: string[];
  bigQueryDatasets: string[];
  loggingSinks: string[];
  outputRoot: string;
}

export function defaultIamConfigFromEnv(outputRoot: string): IamFetchConfig {
  return {
    projectId: process.env.GCP_PROJECT_ID || "",
    serviceAccounts: parseCsvEnv(process.env.GCP_SERVICE_ACCOUNTS),
    bigQueryDatasets: parseCsvEnv(process.env.GCP_BQ_DATASETS),
    loggingSinks: parseCsvEnv(process.env.GCP_LOGGING_SINKS),
    outputRoot
  };
}

export function fetchIamState(config: IamFetchConfig): unknown {
  const iamRoot = outputPath(config.outputRoot, "iam");
  const projectIam = readJsonCommand(`gcloud projects get-iam-policy ${config.projectId} --format=json`);
  writeJsonFile(outputPath(iamRoot, "project-iam.json"), projectIam);

  const serviceAccounts =
    config.serviceAccounts.length > 0
      ? config.serviceAccounts
      : extractServiceAccounts(
          readJsonCommand(`gcloud iam service-accounts list --project=${config.projectId} --format=json`).payload
        );

  const serviceAccountPolicies = serviceAccounts.map((serviceAccount) => {
    const result = readJsonCommand(
      `gcloud iam service-accounts get-iam-policy ${serviceAccount} --project=${config.projectId} --format=json`
    );
    writeJsonFile(outputPath(iamRoot, `service-account-${safeName(serviceAccount)}.json`), result);
    return { serviceAccount, result };
  });

  const datasetPolicies = config.bigQueryDatasets.map((datasetId) => {
    const result = readJsonCommand(
      `gcloud alpha bq datasets get-iam-policy ${datasetId} --project=${config.projectId} --format=json`
    );
    writeJsonFile(outputPath(iamRoot, `bigquery-dataset-${safeName(datasetId)}.json`), result);
    return { datasetId, result };
  });

  const sinkNames =
    config.loggingSinks.length > 0
      ? config.loggingSinks
      : extractLoggingSinks(readJsonCommand(`gcloud logging sinks list --project=${config.projectId} --format=json`).payload);

  const sinkPolicies = sinkNames.map((sinkName) => {
    const sink = readJsonCommand(`gcloud logging sinks describe ${sinkName} --project=${config.projectId} --format=json`);
    const sinkRecord = {
      sinkName,
      fetchedAt: new Date().toISOString(),
      writerIdentity: extractWriterIdentity(sink.payload),
      sinkDetails: sink
    };
    writeJsonFile(outputPath(iamRoot, `logging-sink-${safeName(sinkName)}.json`), sinkRecord);
    return sinkRecord;
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    projectIam,
    serviceAccountPolicies,
    datasetPolicies,
    sinkPolicies
  };
  writeJsonFile(outputPath(iamRoot, "iam-index.json"), summary);
  return summary;
}

function extractServiceAccounts(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>).email : undefined))
    .filter((email): email is string => typeof email === "string" && email.length > 0);
}

function extractLoggingSinks(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>).name : undefined))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

function extractWriterIdentity(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>).writerIdentity;
  return typeof value === "string" ? value : null;
}
