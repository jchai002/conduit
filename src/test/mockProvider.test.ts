import { describe, it, expect } from "vitest";
import { MockProvider } from "../providers/business-context/mock/mockProvider";

describe("MockProvider", () => {
  const provider = new MockProvider();

  it("reports as configured", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("has correct id and displayName", () => {
    expect(provider.id).toBe("mock");
    expect(provider.displayName).toBe("Mock (Test Data)");
  });

  describe("searchMessages", () => {
    it("finds messages by keyword", async () => {
      const results = await provider.searchMessages({ query: "rate limiting" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].text).toContain("rate limiting");
    });

    it("finds sign up form messages", async () => {
      const results = await provider.searchMessages({ query: "sign up form" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((m) => m.text.includes("sign up form"))).toBe(true);
    });

    it("filters by from: operator", async () => {
      const results = await provider.searchMessages({ query: "from:sarah" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((m) => m.author === "sarah")).toBe(true);
    });

    it("filters by in: operator", async () => {
      const results = await provider.searchMessages({ query: "in:backend" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((m) => m.channel === "backend")).toBe(true);
    });

    it("combines operator with keyword", async () => {
      const results = await provider.searchMessages({
        query: "from:sarah rate",
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((m) => m.author === "sarah")).toBe(true);
      expect(results.some((m) => m.text.toLowerCase().includes("rate"))).toBe(true);
    });

    it("respects maxResults", async () => {
      const results = await provider.searchMessages({
        query: "from:sarah",
        maxResults: 1,
      });
      expect(results.length).toBe(1);
    });

    it("returns empty for no matches", async () => {
      const results = await provider.searchMessages({
        query: "xyznonexistent",
      });
      expect(results.length).toBe(0);
    });

    it("returns all messages when only operator and no keywords", async () => {
      const results = await provider.searchMessages({ query: "from:mike" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((m) => m.author === "mike")).toBe(true);
    });
  });

  describe("getThread", () => {
    it("returns thread with replies", async () => {
      // The rate-limiting thread
      const thread = await provider.getThread("backend", "1706800000.000100");
      expect(thread).not.toBeNull();
      expect(thread!.parentMessage.author).toBe("sarah");
      expect(thread!.replies.length).toBe(2);
      expect(thread!.replies[0].author).toBe("mike");
    });

    it("returns sign up form thread", async () => {
      const thread = await provider.getThread("product", "1707050000.000750");
      expect(thread).not.toBeNull();
      expect(thread!.parentMessage.text).toContain("sign up form");
      expect(thread!.replies.length).toBe(2);
    });

    it("returns null for unknown thread", async () => {
      const thread = await provider.getThread("backend", "9999999.000000");
      expect(thread).toBeNull();
    });
  });
});
