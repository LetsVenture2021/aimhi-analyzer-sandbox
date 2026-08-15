export interface AgentErrorResult {
  status: "error";
  code: string;
  message: string;
  retry: boolean;
  command?: string;
  resource?: string;
  details?: unknown;
}

export class AgentError extends Error {
  public readonly result: AgentErrorResult;

  constructor(result: AgentErrorResult) {
    super(result.message);
    this.name = "AgentError";
    this.result = result;
  }
}

export const errorResult = (
  code: string,
  message: string,
  retry = false,
  extras: Partial<Omit<AgentErrorResult, "status" | "code" | "message" | "retry">> = {},
): AgentErrorResult => ({
  status: "error",
  code,
  message,
  retry,
  ...extras,
});
