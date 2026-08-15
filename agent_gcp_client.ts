import { execSync } from "node:child_process";

export interface AgentIdentityConfig {
  projectId: string;
  serviceAccount: string;
}

const ASCII_PATTERN = /^[\x20-\x7E]*$/;

const ensureAscii = (value: string, label: string): void => {
  if (!ASCII_PATTERN.test(value)) {
    throw new Error(`Non-ASCII input rejected for ${label}`);
  }
};

const shellEscape = (value: string): string => {
  ensureAscii(value, "shellEscape");
  return `'${value.replace(/'/g, `'\\''`)}'`;
};

const stringify = (value: unknown): string => {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export class AgentGcpClient {
  private readonly projectId: string;
  private readonly serviceAccount: string;

  constructor(config: AgentIdentityConfig) {
    this.projectId = config.projectId;
    this.serviceAccount = config.serviceAccount;
  }

  public getServiceAccount(): string {
    return this.serviceAccount;
  }

  public hasRoles(requiredRoles: string[]): { ok: boolean; missing: string[] } {
    const cmd = `gcloud projects get-iam-policy ${shellEscape(this.projectId)} --format=json`;
    const raw = this.runCommand(cmd);
    const policy = JSON.parse(raw) as { bindings?: Array<{ role?: string; members?: string[] }> };
    const member = `serviceAccount:${this.serviceAccount}`;
    const granted = new Set<string>();
    for (const binding of policy.bindings ?? []) {
      if ((binding.members ?? []).includes(member) && binding.role) {
        granted.add(binding.role);
      }
    }
    const missing = requiredRoles.filter((role) => !granted.has(role));
    return { ok: missing.length === 0, missing };
  }

  public grantRole(member: string, role: string, resource: string): unknown {
    const project = this.projectFromResource(resource);
    const cmd = `gcloud projects add-iam-policy-binding ${shellEscape(project)} --member=${shellEscape(member)} --role=${shellEscape(role)} --quiet --format=json`;
    return JSON.parse(this.runCommand(cmd));
  }

  public revokeRole(member: string, role: string, resource: string): unknown {
    const project = this.projectFromResource(resource);
    const cmd = `gcloud projects remove-iam-policy-binding ${shellEscape(project)} --member=${shellEscape(member)} --role=${shellEscape(role)} --quiet --format=json`;
    return JSON.parse(this.runCommand(cmd, true) || "{}");
  }

  public listRoles(member: string, resource: string): string[] {
    const project = this.projectFromResource(resource);
    const cmd = `gcloud projects get-iam-policy ${shellEscape(project)} --format=json`;
    const raw = this.runCommand(cmd);
    const policy = JSON.parse(raw) as { bindings?: Array<{ role?: string; members?: string[] }> };
    const roles = (policy.bindings ?? [])
      .filter((b) => (b.members ?? []).includes(member))
      .map((b) => b.role)
      .filter((r): r is string => Boolean(r));
    return Array.from(new Set(roles));
  }

  public bindSinkWriter(sinkWriter: string, role: string, resource: string): unknown {
    return this.grantRole(sinkWriter, role, resource);
  }

  public bindAgentPermissions(member: string, resource: string): unknown {
    const roles = [
      "roles/run.admin",
      "roles/cloudbuild.builds.editor",
      "roles/logging.configWriter",
      "roles/logging.logWriter",
      "roles/bigquery.admin",
      "roles/bigquery.dataEditor",
      "roles/resourcemanager.projectIamAdmin",
    ];
    return roles.map((role) => this.grantRole(member, role, resource));
  }

  public createDataset(dataset: string, location: string): string {
    const existsCmd = `bq --project_id=${shellEscape(this.projectId)} ls --format=json`;
    const list = JSON.parse(this.runCommand(existsCmd)) as Array<{ datasetReference?: { datasetId?: string } }>;
    if (list.some((d) => d.datasetReference?.datasetId === dataset)) {
      return "Dataset already exists";
    }
    const cmd = `bq --location=${shellEscape(location)} mk --dataset --project_id=${shellEscape(this.projectId)} ${shellEscape(`${this.projectId}:${dataset}`)}`;
    return this.runCommand(cmd);
  }

  public createTable(table: string, schema: string): string {
    const cmd = `bq mk --table ${shellEscape(table)} ${shellEscape(schema)}`;
    return this.runCommand(cmd, true) || "Table already exists or no-op";
  }

  public applySchema(table: string, schema: string): string {
    const cmd = `bq update ${shellEscape(table)} ${shellEscape(schema)}`;
    return this.runCommand(cmd);
  }

  public runQuery(sql: string): unknown {
    const cmd = `bq query --use_legacy_sql=false --format=json ${shellEscape(sql)}`;
    return JSON.parse(this.runCommand(cmd) || "[]");
  }

  public insertTelemetry(table: string, payload: Record<string, unknown>): string {
    const json = stringify(payload);
    const escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "''");
    const sql = `INSERT INTO \`${table}\` (payload) VALUES ('${escaped}')`;
    const cmd = `bq query --use_legacy_sql=false --format=none ${shellEscape(sql)}`;
    return this.runCommand(cmd);
  }

  public createSink(sink: string, destination: string, filter: string): string {
    const list = this.runCommand("gcloud logging sinks list --format=json");
    const sinks = JSON.parse(list) as Array<{ name?: string }>;
    if (sinks.some((s) => s.name === sink)) {
      return "Sink already exists";
    }
    const cmd = `gcloud logging sinks create ${shellEscape(sink)} ${shellEscape(destination)} --log-filter=${shellEscape(filter)} --format=json`;
    return this.runCommand(cmd);
  }

  public updateSink(sink: string, destination: string, filter: string): string {
    const cmd = `gcloud logging sinks update ${shellEscape(sink)} ${shellEscape(destination)} --log-filter=${shellEscape(filter)} --format=json`;
    return this.runCommand(cmd);
  }

  public deleteSink(sink: string): string {
    const cmd = `gcloud logging sinks delete ${shellEscape(sink)} --quiet`;
    return this.runCommand(cmd, true) || "Sink already absent";
  }

  public emitLog(logName: string, payload: Record<string, unknown> | string, severity = "INFO"): string {
    const body = typeof payload === "string" ? payload : stringify(payload);
    const cmd = `gcloud logging write ${shellEscape(logName)} ${shellEscape(body)} --severity=${shellEscape(severity)} --payload-type=json`;
    return this.runCommand(cmd);
  }

  public deployService(service: string, image: string, region: string): string {
    const cmd = `gcloud run deploy ${shellEscape(service)} --image=${shellEscape(image)} --region=${shellEscape(region)} --platform=managed --quiet --format=json`;
    return this.runCommand(cmd);
  }

  public updateService(service: string, image: string, region: string): string {
    return this.deployService(service, image, region);
  }

  public restartService(service: string, region: string): string {
    const cmd = `gcloud run services update-traffic ${shellEscape(service)} --region=${shellEscape(region)} --to-latest --quiet --format=json`;
    return this.runCommand(cmd);
  }

  public describeService(service: string, region: string): unknown {
    const cmd = `gcloud run services describe ${shellEscape(service)} --region=${shellEscape(region)} --format=json`;
    return JSON.parse(this.runCommand(cmd));
  }

  public runBuild(config: string): string {
    const cmd = `gcloud builds submit --config=${shellEscape(config)} --project=${shellEscape(this.projectId)} --format=json`;
    return this.runCommand(cmd);
  }

  public triggerBuild(trigger: string, branch: string): string {
    const cmd = `gcloud builds triggers run ${shellEscape(trigger)} --branch=${shellEscape(branch)} --project=${shellEscape(this.projectId)} --format=json`;
    return this.runCommand(cmd);
  }

  public listBuilds(limit = 20): unknown {
    const cmd = `gcloud builds list --project=${shellEscape(this.projectId)} --limit=${shellEscape(String(limit))} --format=json`;
    return JSON.parse(this.runCommand(cmd));
  }

  public deployPipeline(pipeline: string, source: string): string {
    const cmd = `gcloud builds submit ${shellEscape(source)} --substitutions=${shellEscape(`_PIPELINE=${pipeline}`)} --project=${shellEscape(this.projectId)} --format=json`;
    return this.runCommand(cmd);
  }

  public validatePipeline(_pipeline: string, source: string): string {
    const cmd = `gcloud builds submit ${shellEscape(source)} --no-source --dry-run --project=${shellEscape(this.projectId)} --format=json`;
    return this.runCommand(cmd);
  }

  public runPipeline(pipeline: string, args: string): string {
    const cmd = `gcloud builds triggers run ${shellEscape(pipeline)} --substitutions=${shellEscape(args)} --project=${shellEscape(this.projectId)} --format=json`;
    return this.runCommand(cmd);
  }

  public listPipelines(source: string): unknown {
    const cmd = `gcloud builds triggers list --filter=${shellEscape(`name:${source}`)} --project=${shellEscape(this.projectId)} --format=json`;
    return JSON.parse(this.runCommand(cmd));
  }

  private projectFromResource(resource: string): string {
    ensureAscii(resource, "resource");
    const project = resource.split(":")[0];
    return project || this.projectId;
  }

  private runCommand(command: string, ignoreFailure = false): string {
    ensureAscii(command, "command");
    try {
      const out = execSync(`gcloud auth activate-service-account ${shellEscape(this.serviceAccount)} --quiet >/dev/null 2>&1 || true; ${command}`, {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        shell: "/bin/bash",
      });
      return out.trim();
    } catch (error) {
      if (ignoreFailure) return "";
      const err = error as { stdout?: string; stderr?: string; message?: string };
      const text = [err.stdout, err.stderr, err.message].filter(Boolean).join(" ").trim();
      throw new Error(text || "Command execution failed");
    }
  }
}
