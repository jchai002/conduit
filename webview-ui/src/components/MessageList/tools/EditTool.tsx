/**
 * Renders an Edit tool call as a diff view — red lines for removed
 * content, green lines for added content, similar to a git diff.
 *
 * Truncates at 30 lines per section to keep the UI manageable.
 * The file path is shortened to the last 3 segments for readability.
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { ToolResult } from "./ToolResult";

const MAX_DIFF_LINES = 30;

interface EditToolProps {
  tool: ToolCall;
}

export function EditTool({ tool }: EditToolProps) {
  let filePath = "";
  let oldLines: string[] = [];
  let newLines: string[] = [];

  try {
    const parsed = JSON.parse(tool.input);
    filePath = parsed.file_path || "";
    oldLines = (parsed.old_string || "").split("\n");
    newLines = (parsed.new_string || "").split("\n");
  } catch {
    // Fall through — show empty diff
  }

  const oldTruncated = oldLines.length > MAX_DIFF_LINES;
  const newTruncated = newLines.length > MAX_DIFF_LINES;
  const visibleOld = oldLines.slice(0, MAX_DIFF_LINES);
  const visibleNew = newLines.slice(0, MAX_DIFF_LINES);

  return (
    <div className="message tool-call tool-edit" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Edit</div>
      <div className="diff-file-path" title={filePath}>
        {shortenPath(filePath)}
      </div>
      <div className="diff-block">
        {visibleOld.map((line, i) => (
          <div key={`old-${i}`} className="diff-line diff-removed">
            - {line}
          </div>
        ))}
        {oldTruncated && (
          <div className="diff-line diff-truncated">
            {"  "}... {oldLines.length - MAX_DIFF_LINES} more removed lines
          </div>
        )}
        {visibleNew.map((line, i) => (
          <div key={`new-${i}`} className="diff-line diff-added">
            + {line}
          </div>
        ))}
        {newTruncated && (
          <div className="diff-line diff-truncated">
            {"  "}... {newLines.length - MAX_DIFF_LINES} more added lines
          </div>
        )}
      </div>
      <ToolResult result={tool.result} />
    </div>
  );
}
