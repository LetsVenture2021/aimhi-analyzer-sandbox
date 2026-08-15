export type ExecutionContext = "Cloud Run" | "Cloud Functions" | "Cloud Build";

export interface AgentCommandDefinition {
  command_name: string;
  description: string;
  arguments: Record<string, string>;
  required_roles: string[];
  execution_context: ExecutionContext;
  returns: {
    status: "ok" | "error";
    command: string;
    resource?: string;
    details?: string;
    code?: string;
    message?: string;
    retry?: boolean;
  };
}

export interface AgentRunRequest {
  command: string;
  args: Record<string, unknown>;
}

const BASE_OK_RETURN = {
  status: "ok" as const,
  command: "string",
  resource: "string",
  details: "string",
};

export const AGENT_COMMANDS: Record<string, AgentCommandDefinition> = {
  grant_role: {
    command_name: "grant_role",
    description: "Grant IAM role binding to member on project resource.",
    arguments: { member: "string", role: "string", resource: "string" },
    required_roles: ["roles/resourcemanager.projectIamAdmin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  revoke_role: {
    command_name: "revoke_role",
    description: "Revoke IAM role binding from member on project resource.",
    arguments: { member: "string", role: "string", resource: "string" },
    required_roles: ["roles/resourcemanager.projectIamAdmin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  list_roles: {
    command_name: "list_roles",
    description: "List IAM roles bound to a member on project resource.",
    arguments: { member: "string", resource: "string" },
    required_roles: ["roles/viewer"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  bind_sink_writer: {
    command_name: "bind_sink_writer",
    description: "Bind logging sink writer identity to target role.",
    arguments: { sink_writer: "string", role: "string", resource: "string" },
    required_roles: ["roles/resourcemanager.projectIamAdmin", "roles/logging.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  bind_agent_permissions: {
    command_name: "bind_agent_permissions",
    description: "Apply standard autonomy permissions to agent identity.",
    arguments: { member: "string", resource: "string" },
    required_roles: ["roles/resourcemanager.projectIamAdmin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  create_dataset: {
    command_name: "create_dataset",
    description: "Create BigQuery dataset if it does not already exist.",
    arguments: { dataset: "string", location: "string" },
    required_roles: ["roles/bigquery.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  create_table: {
    command_name: "create_table",
    description: "Create BigQuery table if it does not already exist.",
    arguments: { table: "string", schema: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  apply_schema: {
    command_name: "apply_schema",
    description: "Apply or update BigQuery table schema idempotently.",
    arguments: { table: "string", schema: "string" },
    required_roles: ["roles/bigquery.dataOwner"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  query: {
    command_name: "query",
    description: "Run BigQuery SQL query and return structured result.",
    arguments: { sql: "string" },
    required_roles: ["roles/bigquery.jobUser"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  insert_telemetry: {
    command_name: "insert_telemetry",
    description: "Insert telemetry row into autonomy telemetry table.",
    arguments: { table: "string", payload: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  create_sink: {
    command_name: "create_sink",
    description: "Create logging sink if absent.",
    arguments: { sink: "string", destination: "string", filter: "string" },
    required_roles: ["roles/logging.configWriter"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  update_sink: {
    command_name: "update_sink",
    description: "Update existing logging sink.",
    arguments: { sink: "string", destination: "string", filter: "string" },
    required_roles: ["roles/logging.configWriter"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  delete_sink: {
    command_name: "delete_sink",
    description: "Delete logging sink if present.",
    arguments: { sink: "string" },
    required_roles: ["roles/logging.configWriter"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  emit_log: {
    command_name: "emit_log",
    description: "Emit structured log entry using gcloud logging write.",
    arguments: { log_name: "string", payload: "string", severity: "string" },
    required_roles: ["roles/logging.logWriter"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  deploy_service: {
    command_name: "deploy_service",
    description: "Deploy Cloud Run service idempotently.",
    arguments: { service: "string", image: "string", region: "string" },
    required_roles: ["roles/run.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  update_service: {
    command_name: "update_service",
    description: "Update Cloud Run service image and config.",
    arguments: { service: "string", image: "string", region: "string" },
    required_roles: ["roles/run.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  restart_service: {
    command_name: "restart_service",
    description: "Restart Cloud Run service by forcing no-traffic deploy.",
    arguments: { service: "string", region: "string" },
    required_roles: ["roles/run.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  describe_service: {
    command_name: "describe_service",
    description: "Describe Cloud Run service state.",
    arguments: { service: "string", region: "string" },
    required_roles: ["roles/run.viewer"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  run_build: {
    command_name: "run_build",
    description: "Submit Cloud Build from source or config.",
    arguments: { config: "string" },
    required_roles: ["roles/cloudbuild.builds.editor"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  trigger_build: {
    command_name: "trigger_build",
    description: "Invoke Cloud Build trigger by id.",
    arguments: { trigger: "string", branch: "string" },
    required_roles: ["roles/cloudbuild.builds.editor"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  list_builds: {
    command_name: "list_builds",
    description: "List recent Cloud Build runs.",
    arguments: { limit: "number" },
    required_roles: ["roles/cloudbuild.viewer"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  deploy_pipeline: {
    command_name: "deploy_pipeline",
    description: "Deploy autonomy pipeline config.",
    arguments: { pipeline: "string", source: "string" },
    required_roles: ["roles/cloudbuild.builds.editor", "roles/run.admin"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  validate_pipeline: {
    command_name: "validate_pipeline",
    description: "Validate pipeline config and dependencies.",
    arguments: { pipeline: "string", source: "string" },
    required_roles: ["roles/viewer"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  run_pipeline: {
    command_name: "run_pipeline",
    description: "Run a named autonomy pipeline.",
    arguments: { pipeline: "string", args: "string" },
    required_roles: ["roles/cloudbuild.builds.editor"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  list_pipelines: {
    command_name: "list_pipelines",
    description: "List available autonomy pipeline definitions.",
    arguments: { source: "string" },
    required_roles: ["roles/viewer"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  commit_file: {
    command_name: "commit_file",
    description: "Commit a specific file to GitHub branch.",
    arguments: { file: "string", message: "string" },
    required_roles: ["roles/source.writer"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  push_changes: {
    command_name: "push_changes",
    description: "Push committed branch changes to GitHub remote.",
    arguments: { branch: "string" },
    required_roles: ["roles/source.writer"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  pull_gcp_state: {
    command_name: "pull_gcp_state",
    description: "Pull GCP state snapshot and materialize to repository files.",
    arguments: { output_dir: "string", project: "string" },
    required_roles: ["roles/viewer"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  sync_repo: {
    command_name: "sync_repo",
    description: "Perform bi-directional synchronization between GCP and GitHub.",
    arguments: { branch: "string", project: "string", output_dir: "string" },
    required_roles: ["roles/viewer", "roles/source.writer"],
    execution_context: "Cloud Build",
    returns: BASE_OK_RETURN,
  },
  emit_autonomy_telemetry: {
    command_name: "emit_autonomy_telemetry",
    description: "Emit autonomy telemetry event.",
    arguments: { payload: "string", table: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  emit_canary_telemetry: {
    command_name: "emit_canary_telemetry",
    description: "Emit canary telemetry event.",
    arguments: { payload: "string", table: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  emit_chaos_telemetry: {
    command_name: "emit_chaos_telemetry",
    description: "Emit chaos telemetry event.",
    arguments: { payload: "string", table: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
  emit_security_telemetry: {
    command_name: "emit_security_telemetry",
    description: "Emit security telemetry event.",
    arguments: { payload: "string", table: "string" },
    required_roles: ["roles/bigquery.dataEditor"],
    execution_context: "Cloud Functions",
    returns: BASE_OK_RETURN,
  },
};

export const COMMAND_CATEGORIES: Record<string, string[]> = {
  iam: ["grant_role", "revoke_role", "list_roles", "bind_sink_writer", "bind_agent_permissions"],
  bigquery: ["create_dataset", "create_table", "apply_schema", "query", "insert_telemetry"],
  logging: ["create_sink", "update_sink", "delete_sink", "emit_log"],
  cloud_run: ["deploy_service", "update_service", "restart_service", "describe_service"],
  cloud_build: ["run_build", "trigger_build", "list_builds"],
  autonomy_pipeline: ["deploy_pipeline", "validate_pipeline", "run_pipeline", "list_pipelines"],
  github_sync: ["commit_file", "push_changes", "pull_gcp_state", "sync_repo"],
  telemetry: [
    "emit_autonomy_telemetry",
    "emit_canary_telemetry",
    "emit_chaos_telemetry",
    "emit_security_telemetry",
  ],
};
