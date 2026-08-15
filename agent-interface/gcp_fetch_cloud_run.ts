import { outputPath, readJsonCommand, safeName, writeJsonFile } from "./gcp_utils";

export interface CloudRunFetchConfig {
  projectId: string;
  regions: string[];
  outputRoot: string;
}

export function fetchCloudRunState(config: CloudRunFetchConfig): unknown {
  const cloudRunRoot = outputPath(config.outputRoot, "cloud-run");
  const regionRecords = config.regions.map((region) => {
    const listResult = readJsonCommand(
      `gcloud run services list --project=${config.projectId} --region=${region} --format=json`
    );
    const services = extractServiceNames(listResult.payload);

    const serviceRecords = services.map((serviceName) => {
      const service = readJsonCommand(
        `gcloud run services describe ${serviceName} --project=${config.projectId} --region=${region} --format=json`
      );
      const revisions = readJsonCommand(
        `gcloud run revisions list --project=${config.projectId} --region=${region} --service=${serviceName} --format=json`
      );
      const structured = {
        serviceName,
        region,
        fetchedAt: new Date().toISOString(),
        serviceConfiguration: service,
        environmentVariables: extractEnv(service.payload),
        trafficRouting: extractTraffic(service.payload),
        revisions
      };
      writeJsonFile(outputPath(cloudRunRoot, `service-${safeName(region)}-${safeName(serviceName)}.json`), structured);
      return structured;
    });

    return { region, listResult, serviceRecords };
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    regions: regionRecords
  };
  writeJsonFile(outputPath(cloudRunRoot, "cloud-run-index.json"), summary);
  return summary;
}

function extractServiceNames(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).metadata : undefined))
    .map((metadata) => (metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).name : undefined))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

function extractEnv(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const spec = (payload as Record<string, unknown>).spec;
  if (!spec || typeof spec !== "object") {
    return [];
  }
  const template = (spec as Record<string, unknown>).template;
  if (!template || typeof template !== "object") {
    return [];
  }
  const templateSpec = (template as Record<string, unknown>).spec;
  if (!templateSpec || typeof templateSpec !== "object") {
    return [];
  }
  const containers = (templateSpec as Record<string, unknown>).containers;
  if (!Array.isArray(containers)) {
    return [];
  }
  const envVars: unknown[] = [];
  for (const container of containers) {
    if (!container || typeof container !== "object") {
      continue;
    }
    const env = (container as Record<string, unknown>).env;
    if (Array.isArray(env)) {
      envVars.push(...env);
    }
  }
  return envVars;
}

function extractTraffic(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const spec = (payload as Record<string, unknown>).spec;
  if (!spec || typeof spec !== "object") {
    return [];
  }
  const traffic = (spec as Record<string, unknown>).traffic;
  return Array.isArray(traffic) ? traffic : [];
}
