/**
 * Renders a Write tool call — shows the new file being created
 * with all lines in green (like a git diff for a new file).
 *
 * Truncates at 40 lines. The file path includes a "(new)" suffix
 * to distinguish from edits to existing files.
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { ToolResult } from "./ToolResult";

const MAX_LINES = 40;

interface WriteToolProps {
  tool: ToolCall;
}

export function WriteTool({ tool }: WriteToolProps) {
  let filePath = "";
  let lines: string[] = [];

  try {
    const parsed = JSON.parse(tool.input);
    filePath = parsed.file_path || "";
    lines = (parsed.content || "").split("\n");
  } catch {
    // Fall through — show empty
  }

  const truncated = lines.length > MAX_LINES;
  const visible = lines.slice(0, MAX_LINES);

  return (
    <div className="message tool-call tool-write" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Write</div>
      <div className="diff-file-path" title={filePath}>
        {shortenPath(filePath)} (new)
      </div>
      <div className="diff-block">
        {visible.map((line, i) => (
          <div key={i} className="diff-line diff-added">
            + {line}
          </div>
        ))}
        {truncated && (
          <div className="diff-line diff-truncated">
            {"  "}... {lines.length - MAX_LINES} more lines
          </div>
        )}
      </div>
      <ToolResult result={tool.result} />
    </div>
  );
}
