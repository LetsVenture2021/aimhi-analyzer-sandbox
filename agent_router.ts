import { AgentRunRequest } from "./agent_command_interface";
import { AgentExecutor } from "./agent_executor";
import { AgentGcpClient } from "./agent_gcp_client";
import { AgentGithubSync } from "./agent_github_sync";
import { AgentTelemetry } from "./agent_telemetry";
import { errorResult } from "./agent_error";

export class AgentRouter {
  private readonly executor: AgentExecutor;

  constructor(
    projectId = "aimhi-analyzer-sandbox",
    serviceAccount = "coding-agent@aimhi-analyzer-sandbox.iam.gserviceaccount.com",
    repoRoot = process.cwd(),
  ) {
    const gcpClient = new AgentGcpClient({ projectId, serviceAccount });
    const githubSync = new AgentGithubSync(repoRoot, gcpClient);
    const telemetry = new AgentTelemetry(gcpClient);
    this.executor = new AgentExecutor(gcpClient, githubSync, telemetry);
  }

  public async run(payload: unknown) {
    const request = this.validate(payload);
    return this.executor.execute(request);
  }

  private validate(payload: unknown): AgentRunRequest {
    if (typeof payload !== "object" || payload === null) {
      throw new Error(JSON.stringify(errorResult("INVALID_REQUEST", "Request must be an object", false)));
    }
    const value = payload as { command?: unknown; args?: unknown };
    if (typeof value.command !== "string" || !value.command.trim()) {
      throw new Error(JSON.stringify(errorResult("INVALID_REQUEST", "command is required", false)));
    }
    if (typeof value.args !== "object" || value.args === null || Array.isArray(value.args)) {
      throw new Error(JSON.stringify(errorResult("INVALID_REQUEST", "args must be a key/value object", false)));
    }
    return { command: value.command, args: value.args as Record<string, unknown> };
  }
}

export const agent = {
  run: async (input: AgentRunRequest) => {
    const router = new AgentRouter();
    return router.run(input);
  },
};
