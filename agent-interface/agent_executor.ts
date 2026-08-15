import { spawnSync } from "node:child_process";
import { AgentCommand, AgentCommandResult } from "./agent_command_interface";

function log(event: string, details?: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), details: details ?? {} }));
}

export class AgentExecutor {
  execute(command: AgentCommand): AgentCommandResult {
    const mapped = this.mapToGcloud(command);
    log("agent_gcp_command_start", { type: command.type, args: mapped });
    const result = spawnSync(mapped[0], mapped.slice(1), { encoding: "utf-8", stdio: "pipe" });
    const response: AgentCommandResult = {
      ok: result.status === 0,
      command,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.status ?? 1,
    };
    log("agent_gcp_command_complete", { ok: response.ok, exitCode: response.exitCode, type: command.type });
    return response;
  }

  private mapToGcloud(command: AgentCommand): string[] {
    if (command.type === "apply_iam") return ["gcloud", "projects", "add-iam-policy-binding", ...command.args];
    if (command.type === "deploy_pipeline") return ["gcloud", "builds", "triggers", "run", ...command.args];
    if (command.type === "deploy_cloud_run") return ["gcloud", "run", "deploy", ...command.args];
    if (command.type === "update_bigquery") return ["bq", ...command.args];
    if (command.type === "update_logging_sink") return ["gcloud", "logging", "sinks", ...command.args];
    throw new Error(`Unsupported command type: ${command.type}`);
  }
}
