import { GitHubClientConfig, WorkflowDispatchPayload } from "./github_commit_models";

type JsonObject = Record<string, unknown>;

export class GitHubApiClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly token: string;
  private readonly apiBaseUrl: string;

  constructor(config: GitHubClientConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
    this.apiBaseUrl = config.apiBaseUrl ?? "https://api.github.com";
  }

  private async request(path: string, method: string, body?: JsonObject): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer" + " " + this.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.log(JSON.stringify({ event: "github_request_failed", path, method, status: response.status, responseText }));
      throw new Error(`GitHub API request failed: ${method} ${path} (${response.status})`);
    }
    console.log(JSON.stringify({ event: "github_request_ok", path, method, status: response.status }));
  }

  async triggerWorkflow(payload: WorkflowDispatchPayload): Promise<void> {
    const path = `/repos/${this.owner}/${this.repo}/actions/workflows/${payload.workflowFileName}/dispatches`;
    await this.request(path, "POST", { ref: payload.ref, inputs: payload.inputs ?? {} });
  }
}
