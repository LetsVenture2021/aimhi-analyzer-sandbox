import { AgentCommand, AgentCommandResult } from "./agent_command_interface";
import { AgentExecutor } from "./agent_executor";

function log(event: string, details?: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), details: details ?? {} }));
}

export class AgentRouter {
  constructor(private readonly executor: AgentExecutor) {}

  handle(command: AgentCommand): AgentCommandResult {
    log("agent_route_start", { type: command.type });
    const result = this.executor.execute(command);
    log("agent_route_complete", { type: command.type, ok: result.ok });
    return result;
  }
}
