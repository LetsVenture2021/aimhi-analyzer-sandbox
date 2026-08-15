import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AgentGcpClient } from "./agent_gcp_client";

const ASCII_PATTERN = /^[\x20-\x7E]*$/;

const ensureAscii = (value: string, label: string): void => {
  if (!ASCII_PATTERN.test(value)) {
    throw new Error(`Non-ASCII input rejected for ${label}`);
  }
};

const shellEscape = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export class AgentGithubSync {
  private readonly repoRoot: string;
  private readonly gcpClient: AgentGcpClient;

  constructor(repoRoot: string, gcpClient: AgentGcpClient) {
    this.repoRoot = repoRoot;
    this.gcpClient = gcpClient;
  }

  public commitFile(file: string, message: string): string {
    ensureAscii(file, "file");
    ensureAscii(message, "message");
    this.run(`git add -- ${shellEscape(file)}`);
    const status = this.run("git diff --cached --name-only");
    if (!status.trim()) return "No staged changes to commit";
    return this.run(`git commit -m ${shellEscape(message)}`);
  }

  public pushChanges(branch: string): string {
    ensureAscii(branch, "branch");
    return this.run(`git push origin ${shellEscape(branch)}`);
  }

  public pullGcpState(project: string, outputDir: string): string {
    ensureAscii(project, "project");
    ensureAscii(outputDir, "outputDir");
    const outDir = join(this.repoRoot, outputDir);
    mkdirSync(outDir, { recursive: true });
    const policy = this.run(`gcloud projects get-iam-policy ${shellEscape(project)} --format=json`);
    writeFileSync(join(outDir, "iam_policy.json"), policy, "utf8");
    const sinks = this.run("gcloud logging sinks list --format=json");
    writeFileSync(join(outDir, "logging_sinks.json"), sinks, "utf8");
    const datasets = this.run("bq ls --format=json");
    writeFileSync(join(outDir, "bigquery_datasets.json"), datasets, "utf8");
    return `Pulled GCP state to ${outputDir}`;
  }

  public syncRepo(branch: string, project: string, outputDir: string): string {
    this.pullGcpState(project, outputDir);
    this.commitFile(outputDir, "chore(agent): sync gcp state");
    this.pushChanges(branch);
    return `Repository synchronized with GCP state on branch ${branch}`;
  }

  public autoSyncAfterExecution(command: string, args: Record<string, unknown>): string {
    const syncExempt = new Set(["sync_repo", "pull_gcp_state", "push_changes", "commit_file"]);
    if (syncExempt.has(command)) return "Sync skipped for sync command";
    const project = this.extract(args, "project", "aimhi-analyzer-sandbox");
    const branch = this.extract(args, "branch", "main");
    const outputDir = this.extract(args, "output_dir", "state");
    this.pullGcpState(project, outputDir);
    return `Auto sync complete for ${command}`;
  }

  private extract(args: Record<string, unknown>, key: string, fallback: string): string {
    const value = args[key];
    const str = typeof value === "string" && value.trim() ? value : fallback;
    ensureAscii(str, key);
    return str;
  }

  private run(command: string): string {
    const sa = this.gcpClient.getServiceAccount();
    const out = execSync(`gcloud auth activate-service-account ${shellEscape(sa)} --quiet >/dev/null 2>&1 || true; ${command}`, {
      cwd: this.repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      shell: "/bin/bash",
    });
    return out.trim();
  }
}
