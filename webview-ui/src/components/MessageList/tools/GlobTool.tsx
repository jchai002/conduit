/**
 * Renders a Glob tool call — shows the glob pattern and optional
 * search directory. Styled with the search CSS class (yellow border).
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { ToolResult } from "./ToolResult";

interface GlobToolProps {
  tool: ToolCall;
}

export function GlobTool({ tool }: GlobToolProps) {
  let pattern = "";
  let searchPath = "";

  try {
    const parsed = JSON.parse(tool.input);
    pattern = parsed.pattern || "";
    searchPath = parsed.path || "";
  } catch {
    // Fall through
  }

  return (
    <div className="message tool-call tool-search" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Glob</div>
      <div className="search-query">
        {pattern}
        {searchPath && <>{" "}in {shortenPath(searchPath)}</>}
      </div>
      <ToolResult result={tool.result} placeholder="searching..." />
    </div>
  );
}
