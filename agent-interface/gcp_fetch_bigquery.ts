import { outputPath, parseCsvEnv, readJsonCommand, safeName, writeJsonFile } from "./gcp_utils";

export interface BigQueryFetchConfig {
  projectId: string;
  datasets: string[];
  outputRoot: string;
}

export function defaultBigQueryConfigFromEnv(outputRoot: string): BigQueryFetchConfig {
  return {
    projectId: process.env.GCP_PROJECT_ID || "",
    datasets: parseCsvEnv(process.env.GCP_BQ_DATASETS),
    outputRoot
  };
}

export function fetchBigQueryState(config: BigQueryFetchConfig): unknown {
  const bigQueryRoot = outputPath(config.outputRoot, "bigquery");
  const datasets =
    config.datasets.length > 0
      ? config.datasets
      : extractDatasetIds(readJsonCommand(`gcloud alpha bq datasets list --project=${config.projectId} --format=json`).payload);

  const datasetRecords = datasets.map((datasetId) => {
    const datasetMetadata = readJsonCommand(
      `gcloud alpha bq datasets describe ${datasetId} --project=${config.projectId} --format=json`
    );
    const tables = extractTableIds(
      readJsonCommand(
        `gcloud alpha bq tables list --dataset=${datasetId} --project=${config.projectId} --format=json`
      ).payload
    );
    const tableMetadata = tables.map((tableId) => {
      const tableRecord = readJsonCommand(
        `gcloud alpha bq tables describe ${tableId} --dataset=${datasetId} --project=${config.projectId} --format=json`
      );
      writeJsonFile(outputPath(bigQueryRoot, `table-${safeName(datasetId)}-${safeName(tableId)}.json`), tableRecord);
      return { tableId, tableRecord };
    });
    const datasetRecord = {
      datasetId,
      datasetMetadata,
      tables: tableMetadata
    };
    writeJsonFile(outputPath(bigQueryRoot, `dataset-${safeName(datasetId)}.json`), datasetRecord);
    return datasetRecord;
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    datasets: datasetRecords
  };
  writeJsonFile(outputPath(bigQueryRoot, "bigquery-index.json"), summary);
  return summary;
}

function extractDatasetIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const values: string[] = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const asRecord = entry as Record<string, unknown>;
    const direct = asRecord.datasetId;
    if (typeof direct === "string" && direct.length > 0) {
      values.push(direct);
      continue;
    }
    const ref = asRecord.datasetReference;
    if (ref && typeof ref === "object") {
      const nested = (ref as Record<string, unknown>).datasetId;
      if (typeof nested === "string" && nested.length > 0) {
        values.push(nested);
      }
    }
  }
  return values;
}

function extractTableIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const values: string[] = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const asRecord = entry as Record<string, unknown>;
    const direct = asRecord.tableId;
    if (typeof direct === "string" && direct.length > 0) {
      values.push(direct);
      continue;
    }
    const ref = asRecord.tableReference;
    if (ref && typeof ref === "object") {
      const nested = (ref as Record<string, unknown>).tableId;
      if (typeof nested === "string" && nested.length > 0) {
        values.push(nested);
      }
    }
  }
  return values;
}
