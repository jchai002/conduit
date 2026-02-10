import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../providers/agents/claude-sdk/systemPrompt";

describe("buildSystemPrompt", () => {
  it("includes workspace name", () => {
    const prompt = buildSystemPrompt("my-project", "Slack");
    expect(prompt).toContain("my-project");
  });

  it("includes provider name in tool descriptions", () => {
    const prompt = buildSystemPrompt("test", "Slack");
    expect(prompt).toContain("search Slack messages");
    expect(prompt).toContain("Currently connected: Slack");
  });

  it("adapts to different providers", () => {
    const prompt = buildSystemPrompt("test", "Microsoft Teams");
    expect(prompt).toContain("search Microsoft Teams messages");
    expect(prompt).toContain("Currently connected: Microsoft Teams");
    expect(prompt).toContain("look up something from Microsoft Teams");
  });

  it("includes workflow guidance", () => {
    const prompt = buildSystemPrompt("test", "Slack");
    expect(prompt).toContain("threadId");
    expect(prompt).toContain("Workflow");
  });

  it("includes when-to-use and when-not-to-use guidance", () => {
    const prompt = buildSystemPrompt("test", "Slack");
    expect(prompt).toContain("USE the search tools when");
    expect(prompt).toContain("DO NOT use the search tools when");
    expect(prompt).toContain("When in doubt, just code");
  });
});
