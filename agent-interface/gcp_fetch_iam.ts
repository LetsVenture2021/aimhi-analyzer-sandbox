import path from "node:path";
import { IngestContext, normalizeName, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

type DatasetRef = { id?: string; datasetReference?: { datasetId?: string } };
type ServiceAccountRef = { email?: string };
type SinkRef = { name?: string };

export async function fetchIamState(context: IngestContext): Promise<Record<string, unknown>> {
  const iamDir = path.join(context.outputRoot, "iam");
  const projectEscaped = shellEscape(context.projectId);

  const projectPolicy = await runJsonCommand(`gcloud projects get-iam-policy ${projectEscaped} --format=json`);

  const serviceAccountsRaw = await runJsonCommand(`gcloud iam service-accounts list --project=${projectEscaped} --format=json`);
  const serviceAccounts = Array.isArray(serviceAccountsRaw) ? (serviceAccountsRaw as ServiceAccountRef[]) : [];
  const serviceAccountPolicies = [];
  for (const account of serviceAccounts) {
    if (!account.email) {
      continue;
    }
    const policy = await runJsonCommand(`gcloud iam service-accounts get-iam-policy ${shellEscape(account.email)} --project=${projectEscaped} --format=json`, true);
    serviceAccountPolicies.push({ serviceAccount: account.email, policy });
  }

  const datasetsRaw = await runJsonCommand(`bq --project_id=${projectEscaped} ls --format=prettyjson`, true);
  const datasets = Array.isArray(datasetsRaw) ? (datasetsRaw as DatasetRef[]) : [];
  const datasetPolicies = [];
  for (const dataset of datasets) {
    const datasetId = dataset.datasetReference?.datasetId ?? dataset.id?.split(":")[1];
    if (!datasetId) {
      continue;
    }
    const fqDataset = `${context.projectId}:${datasetId}`;
    const policy = await runJsonCommand(`bq --project_id=${projectEscaped} get-iam-policy --format=prettyjson ${shellEscape(fqDataset)}`, true);
    datasetPolicies.push({ datasetId, policy });
  }

  const sinksRaw = await runJsonCommand(`gcloud logging sinks list --project=${projectEscaped} --format=json`, true);
  const sinks = Array.isArray(sinksRaw) ? (sinksRaw as SinkRef[]) : [];
  const sinkPolicies = [];
  for (const sink of sinks) {
    if (!sink.name) {
      continue;
    }
    const policy = await runJsonCommand(`gcloud logging sinks get-iam-policy ${shellEscape(sink.name)} --project=${projectEscaped} --format=json`, true);
    sinkPolicies.push({ sinkName: sink.name, policy });
  }

  const projectFile = path.join(iamDir, "project-iam.json");
  const serviceAccountFile = path.join(iamDir, "service-account-iam.json");
  const datasetFile = path.join(iamDir, "bigquery-dataset-iam.json");
  const sinkFile = path.join(iamDir, "logging-sink-iam.json");
  const indexFile = path.join(iamDir, "index.json");

  await writeJson(projectFile, projectPolicy);
  await writeJson(serviceAccountFile, { items: serviceAccountPolicies });
  await writeJson(datasetFile, { items: datasetPolicies });
  await writeJson(sinkFile, { items: sinkPolicies });

  const index = {
    resource: "iam",
    generatedAt: new Date().toISOString(),
    files: [projectFile, serviceAccountFile, datasetFile, sinkFile].map((filePath) => path.basename(filePath)),
    counts: {
      serviceAccounts: serviceAccountPolicies.length,
      datasets: datasetPolicies.length,
      sinks: sinkPolicies.length,
    },
  };
  await writeJson(indexFile, index);

  return {
    indexFile: path.join("iam", normalizeName(path.basename(indexFile))),
    counts: index.counts,
  };
}
