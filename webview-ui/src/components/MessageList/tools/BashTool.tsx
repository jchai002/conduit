/**
 * Renders a Bash tool call — shows the command with a "$ " prompt prefix,
 * styled like a terminal. Uses the tool's description as the label if
 * available, otherwise falls back to "Bash".
 */
import type { ToolCall } from "../../../context/types";
import { ToolResult } from "./ToolResult";

interface BashToolProps {
  tool: ToolCall;
}

export function BashTool({ tool }: BashToolProps) {
  let command = "";
  let description = "";

  try {
    const parsed = JSON.parse(tool.input);
    command = parsed.command || "";
    description = parsed.description || "";
  } catch {
    // Fall through
  }

  return (
    <div className="message tool-call tool-bash" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">{description || "Bash"}</div>
      <div className="bash-command">
        <span className="bash-prompt">$ </span>
        <span className="bash-cmd-text">{command}</span>
      </div>
      <ToolResult result={tool.result} />
    </div>
  );
}
