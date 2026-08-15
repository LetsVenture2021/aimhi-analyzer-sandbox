import { outputPath, readJsonCommand, safeName, writeJsonFile } from "./gcp_utils";

export interface LoggingFetchConfig {
  projectId: string;
  outputRoot: string;
}

export function fetchLoggingState(config: LoggingFetchConfig): unknown {
  const loggingRoot = outputPath(config.outputRoot, "logging");
  const sinks = readJsonCommand(`gcloud logging sinks list --project=${config.projectId} --format=json`);
  writeJsonFile(outputPath(loggingRoot, "sinks.json"), sinks);

  const sinkNames = extractSinkNames(sinks.payload);
  const sinkDetails = sinkNames.map((sinkName) => {
    const sink = readJsonCommand(`gcloud logging sinks describe ${sinkName} --project=${config.projectId} --format=json`);
    const structured = {
      sinkName,
      fetchedAt: new Date().toISOString(),
      sinkDefinition: sink,
      sinkFilter: extractSinkField(sink.payload, "filter"),
      sinkDestination: extractSinkField(sink.payload, "destination")
    };
    writeJsonFile(outputPath(loggingRoot, `sink-${safeName(sinkName)}.json`), structured);
    return structured;
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    sinkDetails
  };
  writeJsonFile(outputPath(loggingRoot, "logging-index.json"), summary);
  return summary;
}

function extractSinkNames(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).name : undefined))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

function extractSinkField(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
