import path from "node:path";
import { IngestContext, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

type DatasetRef = { id?: string; datasetReference?: { datasetId?: string } };
type TableRef = { tableReference?: { tableId?: string } };

export async function fetchBigQueryState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "bigquery");
  const projectEscaped = shellEscape(context.projectId);

  const datasetsRaw = await runJsonCommand(`bq --project_id=${projectEscaped} ls --format=prettyjson`, true);
  const datasets = Array.isArray(datasetsRaw) ? (datasetsRaw as DatasetRef[]) : [];

  const datasetMetadata = [];
  const tableSchemas = [];
  const tableMetadata = [];

  for (const dataset of datasets) {
    const datasetId = dataset.datasetReference?.datasetId ?? dataset.id?.split(":")[1];
    if (!datasetId) {
      continue;
    }
    const fqDataset = `${context.projectId}:${datasetId}`;
    const datasetDetails = await runJsonCommand(`bq --project_id=${projectEscaped} show --format=prettyjson ${shellEscape(fqDataset)}`, true);
    datasetMetadata.push({ datasetId, metadata: datasetDetails });

    const tablesRaw = await runJsonCommand(`bq --project_id=${projectEscaped} ls --format=prettyjson ${shellEscape(fqDataset)}`, true);
    const tables = Array.isArray(tablesRaw) ? (tablesRaw as TableRef[]) : [];
    for (const table of tables) {
      const tableId = table.tableReference?.tableId;
      if (!tableId) {
        continue;
      }
      const fqTable = `${context.projectId}:${datasetId}.${tableId}`;
      const tableDetails = await runJsonCommand(`bq --project_id=${projectEscaped} show --format=prettyjson ${shellEscape(fqTable)}`, true);
      tableMetadata.push({ datasetId, tableId, metadata: tableDetails });
      const schema = typeof tableDetails === "object" && tableDetails !== null ? (tableDetails as { schema?: unknown }).schema ?? {} : {};
      tableSchemas.push({ datasetId, tableId, schema });
    }
  }

  await writeJson(path.join(outputDir, "dataset-metadata.json"), { items: datasetMetadata });
  await writeJson(path.join(outputDir, "table-schemas.json"), { items: tableSchemas });
  await writeJson(path.join(outputDir, "table-metadata.json"), { items: tableMetadata });
  await writeJson(path.join(outputDir, "index.json"), {
    resource: "bigquery",
    generatedAt: new Date().toISOString(),
    counts: {
      datasets: datasetMetadata.length,
      tableSchemas: tableSchemas.length,
      tableMetadata: tableMetadata.length,
    },
  });

  return {
    counts: {
      datasets: datasetMetadata.length,
      tableSchemas: tableSchemas.length,
      tableMetadata: tableMetadata.length,
    },
  };
}
