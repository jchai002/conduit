import { describe, it, expect } from "vitest";
import { buildContextPrompt } from "../contextPromptBuilder";
import { Message, Thread } from "../providers/types";

const msg = (overrides: Partial<Message> = {}): Message => ({
  id: "1",
  text: "test message",
  author: "sarah",
  source: "mock",
  channel: "backend",
  timestamp: "1706800000.000100",
  ...overrides,
});

describe("buildContextPrompt", () => {
  it("includes business context header", () => {
    const result = buildContextPrompt("do something", [], []);
    expect(result).toContain("# Business Context");
  });

  it("includes user request", () => {
    const result = buildContextPrompt("implement rate limiting", [], []);
    expect(result).toContain("# User Request");
    expect(result).toContain("implement rate limiting");
  });

  it("includes implementation instruction", () => {
    const result = buildContextPrompt("do something", [], []);
    expect(result).toContain("analyze the codebase and implement what is requested");
  });

  it("formats messages with author and channel", () => {
    const messages = [msg({ author: "sarah", channel: "backend", text: "add rate limiting" })];
    const result = buildContextPrompt("do it", messages, []);
    expect(result).toContain("**sarah** in #backend");
    expect(result).toContain("> add rate limiting");
  });

  it("includes source tag", () => {
    const messages = [msg({ source: "slack" })];
    const result = buildContextPrompt("do it", messages, []);
    expect(result).toContain("[slack]");
  });

  it("formats threads with parent and replies", () => {
    const threads: Thread[] = [
      {
        parentMessage: msg({ author: "sarah", text: "We need rate limiting" }),
        replies: [
          msg({ author: "mike", text: "Sounds good" }),
          msg({ author: "sarah", text: "Using token bucket" }),
        ],
      },
    ];
    const result = buildContextPrompt("implement it", [], threads);
    expect(result).toContain("## Relevant Threads");
    expect(result).toContain("**Thread started by sarah**");
    expect(result).toContain("> We need rate limiting");
    expect(result).toContain("**mike**: Sounds good");
    expect(result).toContain("**sarah**: Using token bucket");
  });

  it("handles both messages and threads", () => {
    const messages = [msg({ text: "standalone message" })];
    const threads: Thread[] = [
      {
        parentMessage: msg({ text: "thread parent" }),
        replies: [msg({ text: "reply" })],
      },
    ];
    const result = buildContextPrompt("do it", messages, threads);
    expect(result).toContain("## Relevant Messages");
    expect(result).toContain("## Relevant Threads");
  });

  it("omits messages section when empty", () => {
    const result = buildContextPrompt("do it", [], []);
    expect(result).not.toContain("## Relevant Messages");
  });

  it("omits threads section when empty", () => {
    const result = buildContextPrompt("do it", [msg()], []);
    expect(result).not.toContain("## Relevant Threads");
  });

  it("formats Slack-style timestamps as dates", () => {
    // 1706800000 = Feb 1 2024
    const messages = [msg({ timestamp: "1706800000.000100" })];
    const result = buildContextPrompt("do it", messages, []);
    expect(result).toContain("2024");
  });
});
