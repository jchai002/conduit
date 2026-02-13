/**
 * Shared component for the tool result area below a tool call.
 *
 * Shows "running..." (or a custom placeholder) while waiting for results,
 * then shows the actual result text once it arrives. Long results are
 * wrapped in CollapsibleView so they clip at ~200px and can be expanded.
 */
import { CollapsibleView } from "../../CollapsibleView";

interface ToolResultProps {
  result?: string;
  placeholder?: string;
}

export function ToolResult({ result, placeholder = "running..." }: ToolResultProps) {
  if (result !== undefined) {
    return (
      <CollapsibleView>
        <div className="message-content tool-result">{result}</div>
      </CollapsibleView>
    );
  }
  return <div className="tool-result-placeholder">{placeholder}</div>;
}
