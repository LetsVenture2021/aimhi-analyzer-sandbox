import { exec } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type GcpCommandResult = {
  command: string;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

export type IngestContext = {
  projectId: string;
  outputRoot: string;
  region: string;
  location: string;
};

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, payload: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, payload, "utf8");
}

export function normalizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function parseJsonOrFallback(raw: string): unknown {
  const text = raw.trim();
  if (!text) {
    return [];
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function runCommand(command: string, allowFailure = false): Promise<GcpCommandResult> {
  if (command.includes("\n")) {
    throw new Error(`Command must be single-line: ${command}`);
  }
  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 32 });
    return { command, success: true, stdout, stderr };
  } catch (error) {
    const nodeError = error as { stdout?: string; stderr?: string; message?: string };
    const result: GcpCommandResult = {
      command,
      success: false,
      stdout: nodeError.stdout ?? "",
      stderr: nodeError.stderr ?? "",
      error: nodeError.message ?? "Unknown command error",
    };
    if (!allowFailure) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  }
}

export async function runJsonCommand(command: string, allowFailure = false): Promise<unknown> {
  const result = await runCommand(command, allowFailure);
  if (!result.success) {
    return { error: result.error, stderr: result.stderr, command: result.command };
  }
  return parseJsonOrFallback(result.stdout);
}

export async function assertServiceAccountExecution(): Promise<string> {
  const command = "gcloud auth list --filter=status:ACTIVE --format=value(account)";
  const result = await runCommand(command);
  const account = result.stdout.trim();
  const isServiceAccount = /^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/.test(account);
  if (!account || !isServiceAccount) {
    throw new Error(`Expected active service account credentials but found: ${account || "none"}`);
  }
  return account;
}
