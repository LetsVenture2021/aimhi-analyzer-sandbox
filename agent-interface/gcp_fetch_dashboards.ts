import path from "node:path";
import { IngestContext, normalizeName, runJsonCommand, shellEscape, writeJson } from "./gcp_state_common";

type DashboardRef = { name?: string; displayName?: string };

export async function fetchDashboardState(context: IngestContext): Promise<Record<string, unknown>> {
  const outputDir = path.join(context.outputRoot, "dashboards");
  const projectEscaped = shellEscape(context.projectId);

  const dashboardRefsRaw = await runJsonCommand(`gcloud monitoring dashboards list --project=${projectEscaped} --format=json`, true);
  const dashboardRefs = Array.isArray(dashboardRefsRaw) ? (dashboardRefsRaw as DashboardRef[]) : [];
  const exportedDashboards = [];

  for (const dashboardRef of dashboardRefs) {
    if (!dashboardRef.name) {
      continue;
    }
    const dashboard = await runJsonCommand(`gcloud monitoring dashboards describe ${shellEscape(dashboardRef.name)} --project=${projectEscaped} --format=json`, true);
    const dashboardId = dashboardRef.name.split("/").pop() ?? dashboardRef.name;
    const dashboardName = normalizeName(`${dashboardRef.displayName ?? "dashboard"}-${dashboardId}`);
    const fileName = `${dashboardName}.json`;
    await writeJson(path.join(outputDir, fileName), dashboard);
    exportedDashboards.push({ name: dashboardRef.name, displayName: dashboardRef.displayName ?? dashboardRef.name, fileName });
  }

  await writeJson(path.join(outputDir, "grafana-index.json"), {
    resource: "dashboards",
    generatedAt: new Date().toISOString(),
    items: exportedDashboards,
  });

  return {
    dashboardCount: exportedDashboards.length,
    files: exportedDashboards.map((item) => item.fileName),
  };
}
