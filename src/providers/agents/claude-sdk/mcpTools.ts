/**
 * MCP Tool definitions — these are the tools Claude can call during a conversation.
 *
 * How MCP tools work:
 * 1. We define each tool with a name, description, and Zod schema for inputs
 * 2. The SDK's `tool()` helper registers them on our in-process MCP server
 * 3. Claude reads the tool descriptions and decides when to call them
 * 4. When Claude calls a tool, the SDK invokes our handler function
 * 5. We return results as text content blocks that Claude reads and uses
 *
 * The `tool()` function from the SDK combines schema validation + handler.
 * Zod schemas are required — they define what parameters Claude can pass.
 *
 * Tool names are derived from the provider ID (e.g. "slack" → "search_slack",
 * "teams" → "search_teams") so they're self-documenting for Claude and future
 * providers get correctly named tools automatically.
 */
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { BusinessContextProvider } from "../../businessContextProvider";
import type { Message, Thread } from "../../types";

/** Returns the MCP tool names for a given provider.
 *  Used here and in claudeSDKAgent.ts (for allowedTools). */
export function getToolNames(provider: BusinessContextProvider) {
  return {
    search: `search_${provider.id}`,
    getThread: `get_${provider.id}_thread`,
  };
}

/** Creates a tool that lets Claude search messages on the provider's platform.
 *  Claude decides when to call this based on the tool description. */
export function createSearchTool(provider: BusinessContextProvider) {
  const names = getToolNames(provider);
  return tool(
    names.search,
    `Search ${provider.displayName} messages. Returns matching messages with author, channel, timestamp, and text.`,
    {
      query: z.string().describe(
        "Search query for finding relevant messages"
      ),
      maxResults: z.number().optional().default(20).describe(
        "Maximum number of results to return"
      ),
    },
    async (input) => {
      const messages = await provider.searchMessages({
        query: input.query,
        maxResults: input.maxResults,
      });
      const text =
        messages.length === 0
          ? "No messages found matching that query. Try broader search terms."
          : formatMessages(messages);
      return { content: [{ type: "text" as const, text }] };
    }
  );
}

/** Creates a tool that lets Claude fetch a full conversation thread.
 *  Claude typically calls this after the search tool finds a relevant message,
 *  to get the full discussion context with all replies. */
export function createGetThreadTool(provider: BusinessContextProvider) {
  const names = getToolNames(provider);
  return tool(
    names.getThread,
    `Fetch a full conversation thread by channel and thread ID. Use this after ${names.search} finds a relevant message to get the complete discussion with all replies.`,
    {
      channelId: z.string().describe("Channel ID (from search results)"),
      threadId: z.string().describe(
        "Thread timestamp ID (from search results, the threadId field)"
      ),
    },
    async (input) => {
      const thread = await provider.getThread(input.channelId, input.threadId);
      const text = thread
        ? formatThread(thread)
        : "Thread not found. The channel ID or thread ID may be incorrect.";
      return { content: [{ type: "text" as const, text }] };
    }
  );
}

function formatMessages(messages: Message[]): string {
  const lines: string[] = [`Found ${messages.length} messages:\n`];
  for (const msg of messages) {
    lines.push("--- Message ---");
    lines.push(`Author: ${msg.author}`);
    lines.push(`Channel: #${msg.channel}`);
    lines.push(`Timestamp: ${msg.timestamp}`);
    if (msg.threadId) lines.push(`Thread ID: ${msg.threadId}`);
    if (msg.permalink) lines.push(`Link: ${msg.permalink}`);
    lines.push(`Text: ${msg.text}`);
    lines.push("");
  }
  return lines.join("\n");
}

function formatThread(thread: Thread): string {
  const lines: string[] = [];
  lines.push(`Thread in #${thread.parentMessage.channel}:`);
  lines.push(`\nOriginal message by ${thread.parentMessage.author}:`);
  lines.push(`> ${thread.parentMessage.text}`);
  if (thread.replies.length > 0) {
    lines.push(`\n${thread.replies.length} replies:`);
    for (const reply of thread.replies) {
      lines.push(`  ${reply.author}: ${reply.text}`);
    }
  }
  return lines.join("\n");
}
