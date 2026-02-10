/**
 * Fallback renderer for tool calls that don't have a specialized
 * component (e.g., custom MCP tools). Shows the tool name as the
 * label and the raw JSON input in a scrollable monospace block.
 */
import type { ToolCall } from "../../../context/types";
import { ToolResult } from "./ToolResult";

interface GenericToolProps {
  tool: ToolCall;
}

export function GenericTool({ tool }: GenericToolProps) {
  return (
    <div className="message tool-call" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">{tool.toolName}</div>
      <div className="message-content tool-input">{tool.input}</div>
      <ToolResult result={tool.result} />
    </div>
  );
}
