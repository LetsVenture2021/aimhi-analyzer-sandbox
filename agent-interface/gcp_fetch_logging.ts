import path from "node:path";
import { IngestContext, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

type Sink = { name?: string; destination?: string; filter?: string; [key: string]: unknown };

export async function fetchLoggingState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "logging");
  const projectEscaped = shellEscape(context.projectId);
  const sinksRaw = await runJsonCommand(`gcloud logging sinks list --project=${projectEscaped} --format=json`, true);
  const sinks = Array.isArray(sinksRaw) ? (sinksRaw as Sink[]) : [];

  const sinkDefinitions = sinks.map((sink) => ({
    name: sink.name ?? "",
    destination: sink.destination ?? "",
    filter: sink.filter ?? "",
    raw: sink,
  }));
  const sinkFilters = sinks.map((sink) => ({ name: sink.name ?? "", filter: sink.filter ?? "" }));
  const sinkDestinations = sinks.map((sink) => ({ name: sink.name ?? "", destination: sink.destination ?? "" }));

  await writeJson(path.join(outputDir, "sink-definitions.json"), { items: sinkDefinitions });
  await writeJson(path.join(outputDir, "sink-filters.json"), { items: sinkFilters });
  await writeJson(path.join(outputDir, "sink-destinations.json"), { items: sinkDestinations });
  await writeJson(path.join(outputDir, "index.json"), {
    resource: "logging",
    generatedAt: new Date().toISOString(),
    count: sinks.length,
  });

  return {
    count: sinks.length,
  };
}
