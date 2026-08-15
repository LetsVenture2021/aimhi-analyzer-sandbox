import { AGENT_COMMANDS, AgentRunRequest } from "./agent_command_interface";
import { AgentError, errorResult } from "./agent_error";
import { AgentSuccessResult, successResult } from "./agent_success";
import { AgentGcpClient } from "./agent_gcp_client";
import { AgentGithubSync } from "./agent_github_sync";
import { AgentTelemetry } from "./agent_telemetry";

const ASCII_PATTERN = /^[\x20-\x7E]*$/;

const isAscii = (value: string): boolean => ASCII_PATTERN.test(value);

export class AgentExecutor {
  constructor(
    private readonly gcpClient: AgentGcpClient,
    private readonly githubSync: AgentGithubSync,
    private readonly telemetry: AgentTelemetry,
  ) {}

  public async execute(request: AgentRunRequest): Promise<AgentSuccessResult | ReturnType<typeof errorResult>> {
    try {
      this.validateAsciiRequest(request);
      const definition = AGENT_COMMANDS[request.command];
      if (!definition) {
        return errorResult("UNKNOWN_COMMAND", `Unknown command ${request.command}`, false, { command: request.command });
      }

      const roleCheck = this.gcpClient.hasRoles(definition.required_roles);
      if (!roleCheck.ok) {
        return errorResult(
          "IAM_PERMISSION_DENIED",
          `Agent lacks ${roleCheck.missing.join(", ")}`,
          false,
          { command: request.command, resource: this.resourceFromArgs(request.args) },
        );
      }

      const commandResult = this.dispatch(request.command, request.args);
      const success = successResult(
        request.command,
        this.resourceFromArgs(request.args),
        "Role applied successfully",
        commandResult,
      );

      this.telemetry.emitAutonomyTelemetry({
        command: request.command,
        status: "ok",
        resource: success.resource,
        details: success.details,
        timestamp: new Date().toISOString(),
        service_account: this.gcpClient.getServiceAccount(),
        metadata: { args: request.args },
      });

      this.githubSync.autoSyncAfterExecution(request.command, request.args);
      return success;
    } catch (error) {
      const details = error instanceof AgentError ? error.result.message : (error as Error).message;
      const failure = errorResult("COMMAND_EXECUTION_FAILED", details, true, {
        command: request.command,
        resource: this.resourceFromArgs(request.args),
      });
      this.telemetry.emitAutonomyTelemetry({
        command: request.command,
        status: "error",
        resource: failure.resource || "unknown",
        details: failure.message,
        timestamp: new Date().toISOString(),
        service_account: this.gcpClient.getServiceAccount(),
        metadata: { args: request.args, code: failure.code },
      });
      return failure;
    }
  }

  private dispatch(command: string, args: Record<string, unknown>): unknown {
    const str = (key: string, fallback = ""): string => {
      const value = args[key];
      return typeof value === "string" ? value : fallback;
    };
    switch (command) {
      case "grant_role":
        return this.gcpClient.grantRole(str("member"), str("role"), str("resource"));
      case "revoke_role":
        return this.gcpClient.revokeRole(str("member"), str("role"), str("resource"));
      case "list_roles":
        return this.gcpClient.listRoles(str("member"), str("resource"));
      case "bind_sink_writer":
        return this.gcpClient.bindSinkWriter(str("sink_writer"), str("role"), str("resource"));
      case "bind_agent_permissions":
        return this.gcpClient.bindAgentPermissions(str("member"), str("resource"));
      case "create_dataset":
        return this.gcpClient.createDataset(str("dataset"), str("location", "US"));
      case "create_table":
        return this.gcpClient.createTable(str("table"), str("schema"));
      case "apply_schema":
        return this.gcpClient.applySchema(str("table"), str("schema"));
      case "query":
        return this.gcpClient.runQuery(str("sql"));
      case "insert_telemetry":
        return this.gcpClient.insertTelemetry(str("table"), this.obj(args.payload));
      case "create_sink":
        return this.gcpClient.createSink(str("sink"), str("destination"), str("filter"));
      case "update_sink":
        return this.gcpClient.updateSink(str("sink"), str("destination"), str("filter"));
      case "delete_sink":
        return this.gcpClient.deleteSink(str("sink"));
      case "emit_log":
        return this.gcpClient.emitLog(str("log_name"), this.obj(args.payload), str("severity", "INFO"));
      case "deploy_service":
        return this.gcpClient.deployService(str("service"), str("image"), str("region", "us-central1"));
      case "update_service":
        return this.gcpClient.updateService(str("service"), str("image"), str("region", "us-central1"));
      case "restart_service":
        return this.gcpClient.restartService(str("service"), str("region", "us-central1"));
      case "describe_service":
        return this.gcpClient.describeService(str("service"), str("region", "us-central1"));
      case "run_build":
        return this.gcpClient.runBuild(str("config"));
      case "trigger_build":
        return this.gcpClient.triggerBuild(str("trigger"), str("branch", "main"));
      case "list_builds":
        return this.gcpClient.listBuilds(Number(args.limit ?? 20));
      case "deploy_pipeline":
        return this.gcpClient.deployPipeline(str("pipeline"), str("source"));
      case "validate_pipeline":
        return this.gcpClient.validatePipeline(str("pipeline"), str("source"));
      case "run_pipeline":
        return this.gcpClient.runPipeline(str("pipeline"), str("args"));
      case "list_pipelines":
        return this.gcpClient.listPipelines(str("source"));
      case "commit_file":
        return this.githubSync.commitFile(str("file"), str("message", "chore(agent): commit file"));
      case "push_changes":
        return this.githubSync.pushChanges(str("branch", "main"));
      case "pull_gcp_state":
        return this.githubSync.pullGcpState(str("project", "aimhi-analyzer-sandbox"), str("output_dir", "state"));
      case "sync_repo":
        return this.githubSync.syncRepo(
          str("branch", "main"),
          str("project", "aimhi-analyzer-sandbox"),
          str("output_dir", "state"),
        );
      case "emit_autonomy_telemetry":
        return this.telemetry.emitAutonomyTelemetry(this.telemetryPayload(command, args), str("table"));
      case "emit_canary_telemetry":
        return this.telemetry.emitCanaryTelemetry(this.telemetryPayload(command, args), str("table"));
      case "emit_chaos_telemetry":
        return this.telemetry.emitChaosTelemetry(this.telemetryPayload(command, args), str("table"));
      case "emit_security_telemetry":
        return this.telemetry.emitSecurityTelemetry(this.telemetryPayload(command, args), str("table"));
      default:
        throw new AgentError(errorResult("UNKNOWN_COMMAND", `Unknown command ${command}`, false, { command }));
    }
  }

  private telemetryPayload(command: string, args: Record<string, unknown>) {
    return {
      command,
      status: "ok" as const,
      resource: this.resourceFromArgs(args),
      details: "Telemetry emitted",
      timestamp: new Date().toISOString(),
      service_account: this.gcpClient.getServiceAccount(),
      metadata: this.obj(args.payload),
    };
  }

  private obj(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
    if (typeof value === "string" && value.trim()) {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return { value };
      }
    }
    return {};
  }

  private resourceFromArgs(args: Record<string, unknown>): string {
    const resource = args.resource;
    if (typeof resource === "string" && resource) return resource;
    const project = typeof args.project === "string" ? args.project : "aimhi-analyzer-sandbox";
    return `${project}:analyzer_autonomy`;
  }

  private validateAsciiRequest(request: AgentRunRequest): void {
    if (!isAscii(request.command)) throw new Error("Command must be ASCII-only");
    for (const [key, value] of Object.entries(request.args ?? {})) {
      if (!isAscii(key)) throw new Error("Argument keys must be ASCII-only");
      const printable = typeof value === "string" ? value : JSON.stringify(value);
      if (!isAscii(printable)) throw new Error(`Argument ${key} must be ASCII-only`);
    }
  }
}
