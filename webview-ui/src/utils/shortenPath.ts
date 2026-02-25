/** Shortens a file path for display by showing only the last 2-3 segments.
 *  e.g., "/home/user/projects/tether/src/chat/messages.ts" → "src/chat/messages.ts" */
export function shortenPath(filePath: string): string {
  // Normalize separators
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= 3) return normalized;
  return ".../" + parts.slice(-3).join("/");
}
