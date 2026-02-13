/**
 * Renders a WebSearch tool call — shows the search query in a clean
 * format with a search icon. Uses the same yellow search accent as
 * Glob/Grep since it's a search operation.
 */
import type { ToolCall } from "../../../context/types";
import { ToolResult } from "./ToolResult";

interface WebSearchToolProps {
  tool: ToolCall;
}

export function WebSearchTool({ tool }: WebSearchToolProps) {
  let query = "";

  try {
    const parsed = JSON.parse(tool.input);
    query = parsed.query || "";
  } catch {
    // Fall through
  }

  return (
    <div className="message tool-call tool-search" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">WebSearch</div>
      <div className="search-query">{query}</div>
      <ToolResult result={tool.result} placeholder="searching..." />
    </div>
  );
}
