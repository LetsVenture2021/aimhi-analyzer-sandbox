import path from "node:path";
import { assertServiceAccountExecution, ensureDir, IngestContext, writeJson } from "./gcp_state_common";
import { fetchBigQueryState } from "./gcp_fetch_bigquery";
import { fetchCloudBuildState } from "./gcp_fetch_cloud_build";
import { fetchCloudRunState } from "./gcp_fetch_cloud_run";
import { fetchDashboardState } from "./gcp_fetch_dashboards";
import { fetchIamState } from "./gcp_fetch_iam";
import { fetchLoggingState } from "./gcp_fetch_logging";
import { fetchModelState } from "./gcp_fetch_models";
import { fetchPipelineState } from "./gcp_fetch_pipelines";

function readArg(name: string, fallback: string): string {
  const envName = name.toUpperCase().replace(/-/g, "_");
  const envValue = process.env[envName];
  if (envValue && envValue.trim()) {
    return envValue.trim();
  }
  const cliArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!cliArg) {
    return fallback;
  }
  const value = cliArg.slice(name.length + 3).trim();
  return value || fallback;
}

async function main(): Promise<void> {
  const projectId = readArg("project-id", "");
  if (!projectId) {
    throw new Error("Provide --project-id=<PROJECT_ID> or PROJECT_ID environment variable.");
  }
  const outputRoot = readArg("output-root", path.resolve(process.cwd(), "gcp-state"));
  const region = readArg("region", "us-central1");
  const location = readArg("location", region);

  const context: IngestContext = {
    projectId,
    outputRoot: path.resolve(outputRoot),
    region,
    location,
  };

  const activeAccount = await assertServiceAccountExecution();
  await ensureDir(context.outputRoot);

  const summary = {
    generatedAt: new Date().toISOString(),
    activeAccount,
    projectId: context.projectId,
    region: context.region,
    location: context.location,
    outputRoot: context.outputRoot,
    resources: {
      iam: await fetchIamState(context),
      bigquery: await fetchBigQueryState(context),
      logging: await fetchLoggingState(context),
      cloudRun: await fetchCloudRunState(context),
      cloudBuild: await fetchCloudBuildState(context),
      pipelines: await fetchPipelineState(context),
      dashboards: await fetchDashboardState(context),
      models: await fetchModelState(context),
    },
  };

  await writeJson(path.join(context.outputRoot, "manifest.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const payload = { success: false, error: message, generatedAt: new Date().toISOString() };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
