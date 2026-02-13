/**
 * Renders an Edit tool call as a diff view — red lines for removed
 * content, green lines for added content, similar to a git diff.
 *
 * The file path is shortened to the last 3 segments for readability.
 */
import type { ToolCall } from "../../../context/types";
import { shortenPath } from "../../../utils/shortenPath";
import { CollapsibleView } from "../../CollapsibleView";
import { DiffBlock } from "./DiffBlock";
import { ToolResult } from "./ToolResult";

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

  return (
    <div className="message tool-call tool-edit" data-tool-call-id={tool.toolCallId}>
      <div className="message-label">Edit</div>
      <div className="diff-file-path" title={filePath}>
        {shortenPath(filePath)}
      </div>
      <CollapsibleView>
        <DiffBlock removedLines={oldLines} addedLines={newLines} />
      </CollapsibleView>
      <ToolResult result={tool.result} />
    </div>
  );
}
