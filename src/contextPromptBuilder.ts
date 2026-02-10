import { Message, Thread } from "./providers/types";

/**
 * Builds a context-enriched prompt from generic messages and threads.
 * Platform-agnostic — works with any BusinessContextProvider's output.
 */
export function buildContextPrompt(
  userRequest: string,
  messages: Message[],
  threads: Thread[]
): string {
  const parts: string[] = [];

  parts.push("# Business Context\n");
  parts.push(
    "The following messages and threads provide business context for this request.\n"
  );

  if (messages.length > 0) {
    parts.push("## Relevant Messages\n");
    for (const msg of messages) {
      const sourceTag = msg.source ? ` [${msg.source}]` : "";
      parts.push(
        `**${msg.author}** in #${msg.channel}${sourceTag} (${formatTimestamp(msg.timestamp)}):`
      );
      parts.push(`> ${msg.text}\n`);
    }
  }

  if (threads.length > 0) {
    parts.push("## Relevant Threads\n");
    for (const thread of threads) {
      const sourceTag = thread.parentMessage.source
        ? ` [${thread.parentMessage.source}]`
        : "";
      parts.push(
        `**Thread started by ${thread.parentMessage.author}** in #${thread.parentMessage.channel}${sourceTag}:`
      );
      parts.push(`> ${thread.parentMessage.text}\n`);
      for (const reply of thread.replies) {
        parts.push(`  **${reply.author}**: ${reply.text}`);
      }
      parts.push("");
    }
  }

  parts.push("---\n");
  parts.push("# User Request\n");
  parts.push(userRequest);
  parts.push("\n---\n");
  parts.push(
    "Using the business context above, analyze the codebase and implement what is requested. " +
      "Reference the discussions when making design decisions."
  );

  return parts.join("\n");
}

function formatTimestamp(ts: string): string {
  try {
    const seconds = parseFloat(ts);
    if (isNaN(seconds)) return ts;
    return new Date(seconds * 1000).toLocaleString();
  } catch {
    return ts;
  }
}
