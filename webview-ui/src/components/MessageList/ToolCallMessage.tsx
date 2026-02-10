/**
 * Dispatches a tool call to its specialized renderer based on toolName.
 *
 * Known tools (Edit, Write, Bash, Read, Glob, Grep) each get a dedicated
 * component with structured rendering (diffs, terminal prompts, etc.).
 * Unknown tools fall through to GenericTool which shows raw JSON input.
 */
import type { ToolCall } from "../../context/types";
import { EditTool } from "./tools/EditTool";
import { WriteTool } from "./tools/WriteTool";
import { BashTool } from "./tools/BashTool";
import { ReadTool } from "./tools/ReadTool";
import { GlobTool } from "./tools/GlobTool";
import { GrepTool } from "./tools/GrepTool";
import { GenericTool } from "./tools/GenericTool";

interface ToolCallMessageProps {
  tool: ToolCall;
}

export function ToolCallMessage({ tool }: ToolCallMessageProps) {
  switch (tool.toolName) {
    case "Edit":
      return <EditTool tool={tool} />;
    case "Write":
      return <WriteTool tool={tool} />;
    case "Bash":
      return <BashTool tool={tool} />;
    case "Read":
      return <ReadTool tool={tool} />;
    case "Glob":
      return <GlobTool tool={tool} />;
    case "Grep":
      return <GrepTool tool={tool} />;
    default:
      return <GenericTool tool={tool} />;
  }
}
