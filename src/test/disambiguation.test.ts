import { describe, it, expect } from "vitest";
import { clusterMessages } from "../ui/disambiguation";
import { Message } from "../providers/types";

const msg = (overrides: Partial<Message> = {}): Message => ({
  id: "1",
  text: "test message",
  author: "sarah",
  source: "mock",
  channel: "backend",
  timestamp: "1706800000",
  ...overrides,
});

describe("clusterMessages", () => {
  it("groups messages by thread", () => {
    const messages = [
      msg({ id: "1", threadId: "thread-1", channel: "backend", text: "parent" }),
      msg({ id: "2", threadId: "thread-1", channel: "backend", text: "reply" }),
    ];
    const clusters = clusterMessages(messages);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].messages).toHaveLength(2);
    expect(clusters[0].label).toContain("Thread in #backend");
    expect(clusters[0].label).toContain("2 messages");
  });

  it("separates standalone messages", () => {
    const messages = [
      msg({ id: "1", text: "standalone one" }),
      msg({ id: "2", text: "standalone two", author: "mike" }),
    ];
    // No threadId → standalone
    const clusters = clusterMessages(messages);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].label).toContain("sarah in #backend");
    expect(clusters[1].label).toContain("mike in #backend");
  });

  it("handles mix of threads and standalone", () => {
    const messages = [
      msg({ id: "1", threadId: "t1", channel: "backend" }),
      msg({ id: "2", threadId: "t1", channel: "backend" }),
      msg({ id: "3", text: "standalone" }), // no threadId
    ];
    const clusters = clusterMessages(messages);
    expect(clusters).toHaveLength(2);
  });

  it("separates threads from different channels", () => {
    const messages = [
      msg({ id: "1", threadId: "t1", channel: "backend" }),
      msg({ id: "2", threadId: "t1", channel: "product" }),
    ];
    const clusters = clusterMessages(messages);
    // Different channel:threadId keys → separate clusters
    expect(clusters).toHaveLength(2);
  });

  it("truncates long descriptions to 80 chars", () => {
    const longText = "x".repeat(100);
    const messages = [msg({ id: "1", text: longText })];
    const clusters = clusterMessages(messages);
    expect(clusters[0].description.length).toBeLessThanOrEqual(83); // 80 + "..."
    expect(clusters[0].description).toContain("...");
  });

  it("does not truncate short descriptions", () => {
    const messages = [msg({ id: "1", text: "short" })];
    const clusters = clusterMessages(messages);
    expect(clusters[0].description).toBe("short");
  });

  it("returns empty array for no messages", () => {
    const clusters = clusterMessages([]);
    expect(clusters).toEqual([]);
  });
});
