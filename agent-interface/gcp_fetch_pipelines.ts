import path from "node:path";
import { IngestContext, normalizeName, runJsonCommand, shellEscape, writeJson, writeText } from "./gcp_state_common";

type BuildTrigger = {
  id?: string;
  name?: string;
  description?: string;
  filename?: string;
  serviceAccount?: string;
  createTime?: string;
  tags?: string[];
  substitutions?: Record<string, string>;
};

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const text = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${text}"`;
}

function pipelineYamlFromTrigger(trigger: BuildTrigger): string {
  const lines: string[] = [];
  lines.push(`id: ${yamlScalar(trigger.id ?? "")}`);
  lines.push(`name: ${yamlScalar(trigger.name ?? "")}`);
  lines.push(`description: ${yamlScalar(trigger.description ?? "")}`);
  lines.push(`definition_file: ${yamlScalar(trigger.filename ?? "")}`);
  lines.push(`service_account: ${yamlScalar(trigger.serviceAccount ?? "")}`);
  lines.push(`created_at: ${yamlScalar(trigger.createTime ?? "")}`);
  const tags = trigger.tags ?? [];
  if (tags.length === 0) {
    lines.push("tags: []");
  } else {
    lines.push("tags:");
    for (const tag of tags) {
      lines.push(`  - ${yamlScalar(tag)}`);
    }
  }
  const substitutions = trigger.substitutions ?? {};
  const substitutionEntries = Object.entries(substitutions);
  if (substitutionEntries.length === 0) {
    lines.push("substitutions: {}");
  } else {
    lines.push("substitutions:");
    for (const [key, value] of substitutionEntries) {
      lines.push(`  ${key}: ${yamlScalar(value)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export async function fetchPipelineState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "pipelines");
  const projectEscaped = shellEscape(context.projectId);
  const locationEscaped = shellEscape(context.location);

  const triggersRaw = await runJsonCommand(`gcloud builds triggers list --project=${projectEscaped} --format=json`, true);
  const schedulerRaw = await runJsonCommand(`gcloud scheduler jobs list --project=${projectEscaped} --location=${locationEscaped} --format=json`, true);
  const triggers = Array.isArray(triggersRaw) ? (triggersRaw as BuildTrigger[]) : [];
  const schedulerJobs = Array.isArray(schedulerRaw) ? schedulerRaw : [];

  const yamlFiles: string[] = [];
  for (const trigger of triggers) {
    const baseName = normalizeName(trigger.name ?? trigger.id ?? `pipeline-${yamlFiles.length + 1}`);
    const fileName = `${baseName}.yaml`;
    const filePath = path.join(outputDir, fileName);
    await writeText(filePath, pipelineYamlFromTrigger(trigger));
    yamlFiles.push(fileName);
  }

  await writeJson(path.join(outputDir, "pipeline-metadata.json"), { items: triggers });
  await writeJson(path.join(outputDir, "pipeline-schedules.json"), { items: schedulerJobs });
  await writeJson(path.join(outputDir, "index.json"), {
    resource: "pipelines",
    generatedAt: new Date().toISOString(),
    yamlFiles,
    counts: {
      pipelines: triggers.length,
      schedules: schedulerJobs.length,
    },
  });

  return {
    pipelineCount: triggers.length,
    scheduleCount: schedulerJobs.length,
    yamlFiles,
  };
}
