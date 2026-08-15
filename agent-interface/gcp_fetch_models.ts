import path from "node:path";
import { IngestContext, normalizeName, runJsonCommand, shellEscape, writeJson, writeText } from "./gcp_state_common";

type LookerInstance = { name?: string; platformEdition?: string; region?: string; consumerNetwork?: string; lookerUri?: string };
type VertexModel = { name?: string; displayName?: string; labels?: Record<string, string>; versionId?: string };

function lkmlFromLooker(instance: LookerInstance): string {
  const name = normalizeName(instance.name ?? "looker_instance");
  const lines = [
    `view: ${name} {`,
    `  sql_table_name: "looker_instance_metadata" ;;`,
    `  dimension: instance_name { type: string sql: "${instance.name ?? ""}" ;; }`,
    `  dimension: looker_uri { type: string sql: "${instance.lookerUri ?? ""}" ;; }`,
    `  dimension: region { type: string sql: "${instance.region ?? ""}" ;; }`,
    `  dimension: edition { type: string sql: "${instance.platformEdition ?? ""}" ;; }`,
    "}",
  ];
  return `${lines.join("\n")}\n`;
}

function emitterScript(projectId: string, region: string): string {
  return `#!/usr/bin/env bash\nset -euo pipefail\nPROJECT_ID="${projectId}"\nREGION="${region}"\ngcloud ai models list --project="$PROJECT_ID" --region="$REGION" --format=json\n`;
}

function emitterConfig(projectId: string, region: string): Record<string, unknown> {
  return {
    emitter_name: "vertex-model-state-emitter",
    project_id: projectId,
    region,
    resource: "vertex-ai-models",
    format: "json",
    command: "gcloud ai models list --project=$PROJECT_ID --region=$REGION --format=json",
  };
}

export async function fetchModelState(context: IngestContext): Promise<Record<string, unknown>> {
  const modelDir = path.join(context.outputRoot, "models");
  const scriptDir = path.join(context.outputRoot, "scripts");
  const projectEscaped = shellEscape(context.projectId);
  const regionEscaped = shellEscape(context.region);

  const lookerInstancesRaw = await runJsonCommand(`gcloud looker instances list --project=${projectEscaped} --region=${regionEscaped} --format=json`, true);
  const lookerInstances = Array.isArray(lookerInstancesRaw) ? (lookerInstancesRaw as LookerInstance[]) : [];

  const vertexModelsRaw = await runJsonCommand(`gcloud ai models list --project=${projectEscaped} --region=${regionEscaped} --format=json`, true);
  const vertexModels = Array.isArray(vertexModelsRaw) ? (vertexModelsRaw as VertexModel[]) : [];

  const lkmlFiles: string[] = [];
  for (const instance of lookerInstances) {
    const name = normalizeName(instance.name ?? `looker-${lkmlFiles.length + 1}`);
    const fileName = `${name}.lkml`;
    await writeText(path.join(modelDir, fileName), lkmlFromLooker(instance));
    lkmlFiles.push(fileName);
  }

  const scriptPath = path.join(scriptDir, "emit-model-telemetry.sh");
  const configPath = path.join(scriptDir, "emit-model-telemetry-config.json");
  await writeText(scriptPath, emitterScript(context.projectId, context.region));
  await writeJson(configPath, emitterConfig(context.projectId, context.region));

  await writeJson(path.join(modelDir, "vertex-model-metadata.json"), { items: vertexModels });
  await writeJson(path.join(modelDir, "looker-instance-metadata.json"), { items: lookerInstances });
  await writeJson(path.join(modelDir, "index.json"), {
    resource: "models",
    generatedAt: new Date().toISOString(),
    lkmlFiles,
    modelCount: vertexModels.length,
    lookerInstanceCount: lookerInstances.length,
    telemetryEmitterScript: path.basename(scriptPath),
    telemetryEmitterConfig: path.basename(configPath),
  });

  return {
    modelCount: vertexModels.length,
    lookerInstanceCount: lookerInstances.length,
    lkmlFiles,
    script: path.basename(scriptPath),
  };
}
