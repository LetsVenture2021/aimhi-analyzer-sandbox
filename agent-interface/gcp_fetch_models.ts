import {
  copyFilesWithExtensions,
  outputPath,
  readJsonCommand,
  safeName,
  writeJsonFile,
  writeTextFile
} from "./gcp_utils";

export interface ModelsFetchConfig {
  projectId: string;
  location: string;
  outputRoot: string;
  emitterScriptsPath?: string;
  emitterConfigsPath?: string;
}

export function fetchModelsState(config: ModelsFetchConfig): unknown {
  const modelRoot = outputPath(config.outputRoot, "models");
  const scriptRoot = outputPath(config.outputRoot, "scripts");
  const modelList = readJsonCommand(
    `gcloud ai models list --project=${config.projectId} --region=${config.location} --format=json`
  );
  writeJsonFile(outputPath(modelRoot, "models.json"), modelList);

  const modelItems = Array.isArray(modelList.payload) ? modelList.payload : [];
  const modelRecords = modelItems.map((item) => {
    const modelName = readField(item, "name");
    const displayName = readField(item, "displayName");
    const modelId = modelName || displayName || "model";
    const details = modelName
      ? readJsonCommand(`gcloud ai models describe ${modelName} --project=${config.projectId} --region=${config.location} --format=json`)
      : { command: "", ok: false, fetchedAt: new Date().toISOString(), payload: { error: "missing model name" } };
    writeJsonFile(outputPath(modelRoot, `${safeName(modelId)}.json`), details);
    const lkml = toLkmlView(modelId, config.projectId);
    writeTextFile(outputPath(modelRoot, `${safeName(modelId)}.lkml`), lkml);
    writeTextFile(outputPath(scriptRoot, `${safeName(modelId)}-emitter.sh`), emitterScriptForModel(modelId, config.projectId));
    return { modelId, details };
  });

  const copiedScripts = copyFilesWithExtensions(config.emitterScriptsPath, scriptRoot, [".sh"]);
  const copiedConfigs = copyFilesWithExtensions(config.emitterConfigsPath, modelRoot, [".json", ".yaml", ".yml", ".cfg", ".conf"]);

  writeTextFile(outputPath(scriptRoot, "emit_telemetry.sh"), globalEmitterScript(config.projectId));
  writeJsonFile(outputPath(modelRoot, "emitter-configs.json"), {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    copiedScripts,
    copiedConfigs
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    models: modelRecords,
    copiedScripts,
    copiedConfigs
  };
  writeJsonFile(outputPath(modelRoot, "model-index.json"), summary);
  return summary;
}

function readField(item: unknown, key: string): string {
  if (!item || typeof item !== "object") {
    return "";
  }
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function toLkmlView(modelId: string, projectId: string): string {
  const viewName = safeName(modelId).replace(/[-.]/g, "_");
  const tableRef = `${projectId}.autonomy_telemetry.${safeName(modelId)}`;
  return `view: ${viewName} {\n  sql_table_name: "${tableRef}" ;;\n  dimension: model_id { type: string sql: "${modelId}" ;; }\n}\n`;
}

function emitterScriptForModel(modelId: string, projectId: string): string {
  const safeModel = safeName(modelId);
  return `#!/usr/bin/env bash\nset -euo pipefail\ngcloud logging write analyzer-autonomy "model=${safeModel} status=healthy source=telemetry-emitter" --project=${projectId} --severity=INFO\n`;
}

function globalEmitterScript(projectId: string): string {
  return `#!/usr/bin/env bash\nset -euo pipefail\nTIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"\ngcloud logging write analyzer-autonomy "event=heartbeat timestamp=${TIMESTAMP} source=autonomy-emitter" --project=${projectId} --severity=INFO\n`;
}
