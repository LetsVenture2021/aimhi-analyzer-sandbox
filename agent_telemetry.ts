import { AgentGcpClient } from "./agent_gcp_client";

export interface AgentTelemetryPayload {
  command: string;
  status: "ok" | "error";
  resource: string;
  details: string;
  timestamp: string;
  service_account: string;
  type: "autonomy" | "canary" | "chaos" | "security";
  metadata?: Record<string, unknown>;
}

export class AgentTelemetry {
  private readonly gcpClient: AgentGcpClient;
  private readonly defaultTable: string;

  constructor(gcpClient: AgentGcpClient, defaultTable = "aimhi-analyzer-sandbox.analyzer_autonomy.autonomy_telemetry") {
    this.gcpClient = gcpClient;
    this.defaultTable = defaultTable;
  }

  public emitAutonomyTelemetry(payload: Omit<AgentTelemetryPayload, "type">, table?: string): string {
    return this.emit({ ...payload, type: "autonomy" }, table);
  }

  public emitCanaryTelemetry(payload: Omit<AgentTelemetryPayload, "type">, table?: string): string {
    return this.emit({ ...payload, type: "canary" }, table);
  }

  public emitChaosTelemetry(payload: Omit<AgentTelemetryPayload, "type">, table?: string): string {
    return this.emit({ ...payload, type: "chaos" }, table);
  }

  public emitSecurityTelemetry(payload: Omit<AgentTelemetryPayload, "type">, table?: string): string {
    return this.emit({ ...payload, type: "security" }, table);
  }

  private emit(payload: AgentTelemetryPayload, table?: string): string {
    const target = table || this.defaultTable;
    return this.gcpClient.insertTelemetry(target, payload as unknown as Record<string, unknown>);
  }
}
