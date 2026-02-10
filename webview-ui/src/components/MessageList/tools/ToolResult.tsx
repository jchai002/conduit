/**
 * Shared component for the tool result area below a tool call.
 *
 * Shows "running..." (or a custom placeholder) while waiting for results,
 * then shows the actual result text once it arrives. This replaces the
 * old webview's manual DOM replacement of .tool-result-placeholder.
 */

interface ToolResultProps {
  result?: string;
  placeholder?: string;
}

export function ToolResult({ result, placeholder = "running..." }: ToolResultProps) {
  if (result !== undefined) {
    return <div className="message-content tool-result">{result}</div>;
  }
  return <div className="tool-result-placeholder">{placeholder}</div>;
}
