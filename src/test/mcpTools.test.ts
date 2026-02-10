import { describe, it, expect } from "vitest";
import { createSearchTool, createGetThreadTool, getToolNames } from "../providers/agents/claude-sdk/mcpTools";
import { MockProvider } from "../providers/business-context/mock/mockProvider";

describe("MCP Tools", () => {
  describe("getToolNames", () => {
    it("derives tool names from provider id", () => {
      const provider = new MockProvider();
      const names = getToolNames(provider);
      expect(names.search).toBe("search_mock");
      expect(names.getThread).toBe("get_mock_thread");
    });
  });

  describe("search tool", () => {
    it("returns formatted messages for matching query", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      const result = await tool.handler(
        { query: "sign up form", maxResults: 20 },
        {}
      );
      expect(result.content).toHaveLength(1);
      const text = (result.content[0] as any).text;
      expect(text).toContain("Found");
      expect(text).toContain("sign");
    });

    it("returns no-results message for unmatched query", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      const result = await tool.handler(
        { query: "xyznonexistent123", maxResults: 20 },
        {}
      );
      const text = (result.content[0] as any).text;
      expect(text).toContain("No messages found");
    });

    it("includes channel and author in formatted output", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      const result = await tool.handler(
        { query: "rate limiting", maxResults: 20 },
        {}
      );
      const text = (result.content[0] as any).text;
      expect(text).toContain("Author:");
      expect(text).toContain("Channel:");
    });

    it("includes threadId when present", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      const result = await tool.handler(
        { query: "rate limiting", maxResults: 20 },
        {}
      );
      const text = (result.content[0] as any).text;
      expect(text).toContain("Thread ID:");
    });

    it("has provider-derived name and description", () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      expect(tool.name).toBe("search_mock");
      expect(tool.description).toContain("Search Mock (Test Data) messages");
    });
  });

  describe("get thread tool", () => {
    it("returns formatted thread for valid threadId", async () => {
      const provider = new MockProvider();
      const tool = createGetThreadTool(provider);
      // Use sign-up form thread from mock data
      const result = await tool.handler(
        { channelId: "product", threadId: "1707050000.000750" },
        {}
      );
      const text = (result.content[0] as any).text;
      expect(text).toContain("Thread in #product");
      expect(text).toContain("replies");
    });

    it("returns not-found message for invalid thread", async () => {
      const provider = new MockProvider();
      const tool = createGetThreadTool(provider);
      const result = await tool.handler(
        { channelId: "nonexistent", threadId: "0000.000" },
        {}
      );
      const text = (result.content[0] as any).text;
      expect(text).toContain("Thread not found");
    });

    it("has provider-derived name and cross-references search tool", () => {
      const provider = new MockProvider();
      const tool = createGetThreadTool(provider);
      expect(tool.name).toBe("get_mock_thread");
      expect(tool.description).toContain("Fetch a full conversation thread");
      expect(tool.description).toContain("search_mock");
    });
  });
});
