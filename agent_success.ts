export interface AgentSuccessResult {
  status: "ok";
  command: string;
  resource: string;
  details: string;
  data?: unknown;
}

export const successResult = (
  command: string,
  resource: string,
  details: string,
  data?: unknown,
): AgentSuccessResult => ({
  status: "ok",
  command,
  resource,
  details,
  ...(data === undefined ? {} : { data }),
});
