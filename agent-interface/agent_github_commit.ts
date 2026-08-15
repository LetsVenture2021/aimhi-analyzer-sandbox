import { spawnSync } from "node:child_process";
import { CommitPayload, WorkflowDispatchPayload } from "./github_commit_models";
import { GitHubApiClient } from "./github_api_client";

function log(event: string, details?: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), details: details ?? {} }));
}

function runGit(args: string[]): void {
  const result = spawnSync("git", args, { stdio: "pipe", encoding: "utf-8" });
  if (result.status !== 0) {
    log("git_command_failed", { args, stdout: result.stdout, stderr: result.stderr });
    throw new Error(`git ${args.join(" ")} failed`);
  }
  log("git_command_ok", { args, stdout: result.stdout.trim() });
}

export class AgentGitHubCommit {
  constructor(private readonly githubApiClient: GitHubApiClient) {}

  commitAndPush(payload: CommitPayload): void {
    log("agent_commit_start", payload);
    runGit(["checkout", payload.branch]);
    runGit(["add", ...payload.files]);
    const staged = spawnSync("git", ["diff", "--staged", "--quiet"], { stdio: "pipe" });
    if (staged.status === 0) {
      log("agent_commit_skipped", { reason: "no_changes" });
      return;
    }
    runGit(["commit", "-m", payload.message]);
    runGit(["push", "origin", payload.branch]);
    log("agent_commit_complete", { branch: payload.branch });
  }

  async triggerSyncWorkflows(workflows: WorkflowDispatchPayload[]): Promise<void> {
    for (const workflow of workflows) {
      log("workflow_dispatch_start", { workflow: workflow.workflowFileName, ref: workflow.ref });
      await this.githubApiClient.triggerWorkflow(workflow);
      log("workflow_dispatch_complete", { workflow: workflow.workflowFileName, ref: workflow.ref });
    }
  }
}
