import { describe, it, expect } from "vitest";
import {
  createSearchTool,
  createGetThreadTool,
  createResolveUserTool,
  createResolveChannelTool,
  getToolNames,
} from "../providers/agents/claude-sdk/mcpTools";
import { MockProvider } from "../providers/business-context/mock/mockProvider";
import type { BusinessContextProvider } from "../providers/businessContextProvider";
import type { ResolvedUser, ResolvedChannel } from "../providers/types";

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

  describe("resolve user tool", () => {
    /** Build a mock provider with a resolveUser implementation. */
    function providerWithResolveUser(users: ResolvedUser[]): BusinessContextProvider {
      const base = new MockProvider();
      return {
        id: base.id,
        displayName: base.displayName,
        isConfigured: () => base.isConfigured(),
        configure: () => base.configure(),
        searchMessages: (opts) => base.searchMessages(opts),
        getThread: (c, t) => base.getThread(c, t),
        resolveUser: async () => users,
      };
    }

    it("returns formatted users when matches found", async () => {
      const provider = providerWithResolveUser([
        { id: "U1", name: "anna.pico", displayName: "Anna Pico" },
        { id: "U2", name: "anna.lee", displayName: "Anna Lee" },
      ]);
      const tool = createResolveUserTool(provider);
      const result = await tool.handler({ name: "anna" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain("Found 2 user(s)");
      expect(text).toContain("@anna.pico");
      expect(text).toContain("Anna Pico");
    });

    it("returns no-match message when no users found", async () => {
      const provider = providerWithResolveUser([]);
      const tool = createResolveUserTool(provider);
      const result = await tool.handler({ name: "nonexistent" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain('No users found matching "nonexistent"');
    });

    it("returns not-supported message when provider lacks resolveUser", async () => {
      const provider = new MockProvider(); // MockProvider has no resolveUser
      const tool = createResolveUserTool(provider);
      const result = await tool.handler({ name: "anna" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain("not supported");
    });

    it("has provider-derived name", () => {
      const provider = new MockProvider();
      const tool = createResolveUserTool(provider);
      expect(tool.name).toBe("resolve_mock_user");
    });
  });

  describe("resolve channel tool", () => {
    /** Build a mock provider with a resolveChannel implementation. */
    function providerWithResolveChannel(channels: ResolvedChannel[]): BusinessContextProvider {
      const base = new MockProvider();
      return {
        id: base.id,
        displayName: base.displayName,
        isConfigured: () => base.isConfigured(),
        configure: () => base.configure(),
        searchMessages: (opts) => base.searchMessages(opts),
        getThread: (c, t) => base.getThread(c, t),
        resolveChannel: async () => channels,
      };
    }

    it("returns formatted channels when matches found", async () => {
      const provider = providerWithResolveChannel([
        { id: "C1", name: "all-dashi" },
        { id: "C2", name: "dashi-backend" },
      ]);
      const tool = createResolveChannelTool(provider);
      const result = await tool.handler({ name: "dashi" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain("Found 2 channel(s)");
      expect(text).toContain("#all-dashi");
      expect(text).toContain("#dashi-backend");
    });

    it("returns no-match message when no channels found", async () => {
      const provider = providerWithResolveChannel([]);
      const tool = createResolveChannelTool(provider);
      const result = await tool.handler({ name: "nonexistent" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain('No channels found matching "nonexistent"');
    });

    it("returns not-supported message when provider lacks resolveChannel", async () => {
      const provider = new MockProvider(); // MockProvider has no resolveChannel
      const tool = createResolveChannelTool(provider);
      const result = await tool.handler({ name: "dashi" }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain("not supported");
    });

    it("has provider-derived name", () => {
      const provider = new MockProvider();
      const tool = createResolveChannelTool(provider);
      expect(tool.name).toBe("resolve_mock_channel");
    });
  });

  describe("getToolNames", () => {
    it("includes resolve tool names", () => {
      const provider = new MockProvider();
      const names = getToolNames(provider);
      expect(names.resolveUser).toBe("resolve_mock_user");
      expect(names.resolveChannel).toBe("resolve_mock_channel");
    });
  });

  describe("formatMessages edge cases", () => {
    it("includes permalink when present", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      const result = await tool.handler({ query: "rate limiting", maxResults: 1 }, {});
      const text = (result.content[0] as any).text;
      expect(text).toContain("Link:");
      expect(text).toContain("https://mock.slack.com");
    });

    it("omits threadId for messages without one", async () => {
      const provider = new MockProvider();
      const tool = createSearchTool(provider);
      // "onboarding flow" message has no threadId
      const result = await tool.handler({ query: "onboarding flow", maxResults: 1 }, {});
      const text = (result.content[0] as any).text;
      expect(text).not.toContain("Thread ID:");
    });
  });
});
