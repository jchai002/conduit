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

  const { contextWindow, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } = state.contextUsage;
  if (!contextWindow) return null;

  // Context window usage = all input-side tokens (direct + cached) + output tokens.
  // With prompt caching, inputTokens can be near-zero while cacheReadTokens holds
  // the bulk of the context (e.g. 3 input vs 107,949 cacheRead).
  const used = inputTokens + outputTokens + (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0);
  const rawPct = Math.min(100, (used / contextWindow) * 100);

  // Show 1 decimal place under 10% for granularity, round above 10%.
  // Show "<1%" instead of "0%" so users can tell it's tracking.
  const label = rawPct > 0 && rawPct < 1
    ? "<1%"
    : rawPct < 10
      ? `${rawPct.toFixed(1)}%`
      : `${Math.round(rawPct)}%`;

  // Color: green below 50%, yellow 50-80%, red above 80%
  const color =
    rawPct < 50 ? "var(--vscode-terminal-ansiGreen, #4d9375)"
    : rawPct < 80 ? "var(--vscode-terminal-ansiYellow, #e5c07b)"
    : "var(--vscode-terminal-ansiRed, #e06c75)";

  return (
    <span
      className="context-usage"
      title={`Context: ${used.toLocaleString()} / ${contextWindow.toLocaleString()} tokens (${rawPct.toFixed(1)}% used)`}
      style={{ color }}
    >
      {label}
    </span>
  );
}
