export interface SyncTelemetry {
  event: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface CommitPayload {
  branch: string;
  message: string;
  files: string[];
}

export interface WorkflowDispatchPayload {
  workflowFileName: string;
  ref: string;
  inputs?: Record<string, string>;
}

export interface GitHubClientConfig {
  owner: string;
  repo: string;
  token: string;
  apiBaseUrl?: string;
}
