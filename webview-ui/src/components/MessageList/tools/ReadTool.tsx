/**
 * Renders a Read tool call — shows the file path being read,
 * with optional line range info (offset/limit).
 * Styled with a cyan border to match the old webview's read styling.
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { ToolResult } from "./ToolResult";

interface ReadToolProps {
  tool: ToolCall;
}

export function ReadTool({ tool }: ReadToolProps) {
  let filePath = "";
  let offset: number | undefined;
  let limit: number | undefined;

  try {
    const parsed = JSON.parse(tool.input);
    filePath = parsed.file_path || "";
    offset = parsed.offset;
    limit = parsed.limit;
  } catch {
    // Fall through
  }

  /** Build the range suffix: "(line X, Y lines)" */
  let rangeSuffix = "";
  if (offset !== undefined && limit !== undefined) {
    rangeSuffix = ` (line ${offset}, ${limit} lines)`;
  } else if (offset !== undefined) {
    rangeSuffix = ` (line ${offset})`;
  } else if (limit !== undefined) {
    rangeSuffix = ` (${limit} lines)`;
  }

  return (
    <div className="message tool-call tool-read" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Read</div>
      <div className="diff-file-path" title={filePath}>
        {shortenPath(filePath)}{rangeSuffix}
      </div>
      <ToolResult result={tool.result} placeholder="reading..." />
    </div>
  );
}
