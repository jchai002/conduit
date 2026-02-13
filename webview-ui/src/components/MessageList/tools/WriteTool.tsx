/**
 * Renders a Write tool call — shows the new file being created
 * with all lines in green (like a git diff for a new file).
 *
 * The file path includes a "(new)" suffix to distinguish from
 * edits to existing files.
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { CollapsibleView } from "../../CollapsibleView";
import { DiffBlock } from "./DiffBlock";
import { ToolResult } from "./ToolResult";

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

  return (
    <div className="message tool-call tool-write" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Write</div>
      <div className="diff-file-path" title={filePath}>
        {shortenPath(filePath)} (new)
      </div>
      <CollapsibleView>
        <DiffBlock addedLines={lines} maxLines={40} />
      </CollapsibleView>
      <ToolResult result={tool.result} />
    </div>
  );
}
