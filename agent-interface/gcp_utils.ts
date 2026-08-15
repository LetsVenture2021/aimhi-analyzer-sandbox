import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export type JsonRecord = Record<string, unknown>;

export interface GcpCommandResult {
  command: string;
  ok: boolean;
  fetchedAt: string;
  payload: unknown;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function ensureDirectory(pathValue: string): void {
  mkdirSync(pathValue, { recursive: true });
}

export function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unnamed";
}

export function writeJsonFile(pathValue: string, data: unknown): void {
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeTextFile(pathValue: string, content: string): void {
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function readJsonCommand(command: string): GcpCommandResult {
  try {
    const stdout = execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const trimmed = stdout.trim();
    const parsed = trimmed.length === 0 ? {} : JSON.parse(trimmed);
    return { command, ok: true, fetchedAt: nowIso(), payload: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command,
      ok: false,
      fetchedAt: nowIso(),
      payload: { error: message }
    };
  }
}

export function readTextCommand(command: string): GcpCommandResult {
  try {
    const stdout = execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { command, ok: true, fetchedAt: nowIso(), payload: stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command,
      ok: false,
      fetchedAt: nowIso(),
      payload: { error: message }
    };
  }
}

export function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function outputPath(outputRoot: string, ...parts: string[]): string {
  return resolve(outputRoot, ...parts);
}

export function listFilesIfExists(pathValue: string): string[] {
  if (!existsSync(pathValue)) {
    return [];
  }
  const stat = statSync(pathValue);
  if (stat.isFile()) {
    return [pathValue];
  }
  return readdirSync(pathValue).map((entry) => join(pathValue, entry));
}

export function copyFilesWithExtensions(fromPath: string | undefined, toPath: string, extensions: string[]): string[] {
  if (!fromPath) {
    return [];
  }
  ensureDirectory(toPath);
  const copied: string[] = [];
  for (const candidate of listFilesIfExists(fromPath)) {
    if (!existsSync(candidate) || !statSync(candidate).isFile()) {
      continue;
    }
    const lower = candidate.toLowerCase();
    if (!extensions.some((ext) => lower.endsWith(ext.toLowerCase()))) {
      continue;
    }
    const target = join(toPath, basename(candidate));
    writeTextFile(target, readFileSync(candidate, "utf8"));
    copied.push(target);
  }
  return copied;
}
