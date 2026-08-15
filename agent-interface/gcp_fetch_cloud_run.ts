import path from "node:path";
import { IngestContext, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

type CloudRunService = {
  metadata?: { name?: string };
  spec?: { template?: { spec?: { containers?: Array<{ env?: Array<{ name?: string; value?: string }> }> } }; traffic?: unknown };
  status?: { traffic?: unknown };
};

export async function fetchCloudRunState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "cloud-run");
  const projectEscaped = shellEscape(context.projectId);
  const regionEscaped = shellEscape(context.region);

  const servicesRaw = await runJsonCommand(`gcloud run services list --platform=managed --project=${projectEscaped} --region=${regionEscaped} --format=json`, true);
  const services = Array.isArray(servicesRaw) ? (servicesRaw as CloudRunService[]) : [];

  const serviceConfigurations = [];
  const environmentVariables = [];
  const trafficRouting = [];
  const revisions = [];

  for (const service of services) {
    const serviceName = service.metadata?.name;
    if (!serviceName) {
      continue;
    }
    const describeRaw = await runJsonCommand(`gcloud run services describe ${shellEscape(serviceName)} --platform=managed --project=${projectEscaped} --region=${regionEscaped} --format=json`, true);
    serviceConfigurations.push({ serviceName, config: describeRaw });

    const serviceObject = typeof describeRaw === "object" && describeRaw !== null ? (describeRaw as CloudRunService) : {};
    const containers = serviceObject.spec?.template?.spec?.containers ?? [];
    const env = containers.flatMap((container) => container.env ?? []);
    environmentVariables.push({ serviceName, environmentVariables: env });
    trafficRouting.push({ serviceName, traffic: serviceObject.status?.traffic ?? serviceObject.spec?.traffic ?? [] });

    const revisionsRaw = await runJsonCommand(`gcloud run revisions list --service=${shellEscape(serviceName)} --platform=managed --project=${projectEscaped} --region=${regionEscaped} --format=json`, true);
    revisions.push({ serviceName, revisions: revisionsRaw });
  }

  await writeJson(path.join(outputDir, "service-configuration.json"), { items: serviceConfigurations });
  await writeJson(path.join(outputDir, "environment-variables.json"), { items: environmentVariables });
  await writeJson(path.join(outputDir, "traffic-routing.json"), { items: trafficRouting });
  await writeJson(path.join(outputDir, "revisions.json"), { items: revisions });
  await writeJson(path.join(outputDir, "index.json"), {
    resource: "cloud-run",
    generatedAt: new Date().toISOString(),
    count: services.length,
  });

  return {
    count: services.length,
  };
}
