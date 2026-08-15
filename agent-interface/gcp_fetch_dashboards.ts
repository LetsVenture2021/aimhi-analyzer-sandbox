import { outputPath, readJsonCommand, safeName, writeJsonFile } from "./gcp_utils";

export interface DashboardsFetchConfig {
  projectId: string;
  outputRoot: string;
}

export function fetchDashboardsState(config: DashboardsFetchConfig): unknown {
  const dashboardRoot = outputPath(config.outputRoot, "dashboards");
  const listResult = readJsonCommand(`gcloud monitoring dashboards list --project=${config.projectId} --format=json`);
  writeJsonFile(outputPath(dashboardRoot, "dashboard-list.json"), listResult);

  const dashboards = Array.isArray(listResult.payload) ? listResult.payload : [];
  const details = dashboards.map((dashboard) => {
    const displayName = extractDashboardName(dashboard);
    const dashboardName = extractDashboardResource(dashboard);
    const description = dashboardName
      ? readJsonCommand(`gcloud monitoring dashboards describe ${dashboardName} --project=${config.projectId} --format=json`)
      : { command: "", ok: false, fetchedAt: new Date().toISOString(), payload: { error: "missing dashboard name" } };
    const structured = {
      fetchedAt: new Date().toISOString(),
      displayName,
      dashboardName,
      dashboardJson: description
    };
    writeJsonFile(outputPath(dashboardRoot, `${safeName(displayName || dashboardName || "dashboard")}.json`), structured);
    return structured;
  });

  const summary = {
    fetchedAt: new Date().toISOString(),
    projectId: config.projectId,
    dashboards: details
  };
  writeJsonFile(outputPath(dashboardRoot, "dashboard-index.json"), summary);
  return summary;
}

function extractDashboardName(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const value = (payload as Record<string, unknown>).displayName;
  return typeof value === "string" ? value : "";
}

function extractDashboardResource(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const value = (payload as Record<string, unknown>).name;
  return typeof value === "string" ? value : "";
}
