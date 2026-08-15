export type AgentCommandType = "apply_iam" | "deploy_pipeline" | "deploy_cloud_run" | "update_bigquery" | "update_logging_sink";

export interface AgentCommand {
  type: AgentCommandType;
  args: string[];
}

export interface AgentCommandResult {
  ok: boolean;
  command: AgentCommand;
  stdout: string;
  stderr: string;
  exitCode: number;
}
