import { outputPath, readJsonCommand, safeName, writeTextFile } from "./gcp_utils";

export interface PipelineFetchConfig {
  projectId: string;
  location: string;
  outputRoot: string;
}

export function fetchPipelinesState(config: PipelineFetchConfig): unknown {
  const pipelineRoot = outputPath(config.outputRoot, "pipelines");
  const pipelineJobs = readJsonCommand(
    `gcloud ai pipeline-jobs list --project=${config.projectId} --region=${config.location} --format=json`
  );
  const schedulerJobs = readJsonCommand(
    `gcloud scheduler jobs list --project=${config.projectId} --location=${config.location} --format=json`
  );

  const pipelineYaml = renderYaml({
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    pipelineJobs: pipelineJobs.payload
  });
  writeTextFile(outputPath(pipelineRoot, "pipeline-jobs.yaml"), pipelineYaml);

  const scheduleYaml = renderYaml({
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    schedules: schedulerJobs.payload
  });
  writeTextFile(outputPath(pipelineRoot, "pipeline-schedules.yaml"), scheduleYaml);

  const jobs = Array.isArray(pipelineJobs.payload) ? pipelineJobs.payload : [];
  for (const job of jobs) {
    if (!job || typeof job !== "object") {
      continue;
    }
    const nameValue = (job as Record<string, unknown>).name;
    if (typeof nameValue !== "string" || nameValue.length === 0) {
      continue;
    }
    const perJobYaml = renderYaml({
      fetchedAt: new Date().toISOString(),
      metadata: job
    });
    writeTextFile(outputPath(pipelineRoot, `${safeName(nameValue)}.yaml`), perJobYaml);
  }

  return {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    pipelineJobs,
    schedulerJobs
  };
}

function renderYaml(data: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (data === null) {
    return `${pad}null`;
  }
  if (typeof data === "string") {
    return `${pad}"${data.replace(/"/g, '\\"')}"`;
  }
  if (typeof data === "number" || typeof data === "boolean") {
    return `${pad}${String(data)}`;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${pad}[]`;
    }
    return data
      .map((item) => {
        const rendered = renderYaml(item, indent + 1);
        const trimmed = rendered.trimStart();
        if (trimmed.startsWith("- ")) {
          return `${pad}-\n${rendered}`;
        }
        return `${pad}- ${trimmed.includes("\n") ? `\n${rendered}` : trimmed}`;
      })
      .join("\n");
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return `${pad}{}`;
    }
    return entries
      .map(([key, value]) => {
        const rendered = renderYaml(value, indent + 1);
        const asText = rendered.trimStart();
        if (asText.includes("\n")) {
          return `${pad}${key}:\n${rendered}`;
        }
        return `${pad}${key}: ${asText}`;
      })
      .join("\n");
  }
  return `${pad}"${String(data)}"`;
}
