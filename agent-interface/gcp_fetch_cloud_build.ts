import path from "node:path";
import { IngestContext, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

export async function fetchCloudBuildState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "cloud-build");
  const projectEscaped = shellEscape(context.projectId);

  const triggers = await runJsonCommand(`gcloud builds triggers list --project=${projectEscaped} --format=json`, true);
  const builds = await runJsonCommand(`gcloud builds list --project=${projectEscaped} --format=json --limit=200`, true);

  await writeJson(path.join(outputDir, "build-triggers.json"), { items: triggers });
  await writeJson(path.join(outputDir, "build-history.json"), { items: builds });
  await writeJson(path.join(outputDir, "index.json"), {
    resource: "cloud-build",
    generatedAt: new Date().toISOString(),
  });

  return {
    triggersCount: Array.isArray(triggers) ? triggers.length : 0,
    buildHistoryCount: Array.isArray(builds) ? builds.length : 0,
  };
}
