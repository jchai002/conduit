/**
 * Renders a Grep tool call — shows the regex pattern, optional
 * file glob filter, and optional search directory.
 * Shares the .tool-search CSS class with GlobTool (yellow border).
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { ToolResult } from "./ToolResult";

interface GrepToolProps {
  tool: ToolCall;
}

export function GrepTool({ tool }: GrepToolProps) {
  let pattern = "";
  let glob = "";
  let searchPath = "";

  try {
    const parsed = JSON.parse(tool.input);
    pattern = parsed.pattern || "";
    glob = parsed.glob || "";
    searchPath = parsed.path || "";
  } catch {
    // Fall through
  }

  return (
    <div className="message tool-call tool-search" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Grep</div>
      <div className="search-query">
        /{pattern}/
        {glob && <> {glob}</>}
        {searchPath && <> in {shortenPath(searchPath)}</>}
      </div>
      <ToolResult result={tool.result} placeholder="searching..." />
    </div>
  );
}
