/**
 * Context window usage indicator — shows how much of the model's context
 * window has been consumed as a percentage.
 *
 * Displayed next to the permission toggle in the input toolbar.
 * Only renders after the first SDK turn completes (when we have token data).
 * Color shifts from green → yellow → red as usage increases.
 */
import { useExtensionState } from "../context/ExtensionStateContext";

export function ContextUsage() {
  const { state } = useExtensionState();

  if (!state.contextUsage) return null;

  const { contextWindow, inputTokens, outputTokens } = state.contextUsage;
  if (!contextWindow) return null;

  const used = inputTokens + outputTokens;
  const pct = Math.min(100, Math.round((used / contextWindow) * 100));

  // Color: green below 50%, yellow 50-80%, red above 80%
  const color =
    pct < 50 ? "var(--vscode-terminal-ansiGreen, #4d9375)"
    : pct < 80 ? "var(--vscode-terminal-ansiYellow, #e5c07b)"
    : "var(--vscode-terminal-ansiRed, #e06c75)";

  return (
    <span
      className="context-usage"
      title={`Context: ${used.toLocaleString()} / ${contextWindow.toLocaleString()} tokens (${pct}% used)`}
      style={{ color }}
    >
      {pct}%
    </span>
  );
}
