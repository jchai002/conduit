import { describe, it, expect } from "vitest";
import { analyzeQuery, extractMentions } from "../query/queryAnalyzer";

describe("extractMentions", () => {
  it("extracts @user mentions", () => {
    const result = extractMentions("what did @sarah say about the API?");
    expect(result.users).toEqual(["sarah"]);
    expect(result.cleanedQuery).toBe("what did say about the API?");
  });

  it("extracts #channel mentions", () => {
    const result = extractMentions("search #backend for rate limiting");
    expect(result.channels).toEqual(["backend"]);
    expect(result.cleanedQuery).toBe("search for rate limiting");
  });

  it("extracts both @ and # mentions", () => {
    const result = extractMentions("@mike said in #engineering about migrations");
    expect(result.users).toEqual(["mike"]);
    expect(result.channels).toEqual(["engineering"]);
  });

  it("handles multiple @mentions", () => {
    const result = extractMentions("@sarah and @mike discussed rate limiting");
    expect(result.users).toContain("sarah");
    expect(result.users).toContain("mike");
  });

  it("returns empty for no mentions", () => {
    const result = extractMentions("implement rate limiting");
    expect(result.users).toEqual([]);
    expect(result.channels).toEqual([]);
    expect(result.cleanedQuery).toBe("implement rate limiting");
  });

  it("handles dotted usernames", () => {
    const result = extractMentions("ask @sarah.jones about it");
    expect(result.users).toEqual(["sarah.jones"]);
  });

  it("handles hyphenated channel names", () => {
    const result = extractMentions("check #my-channel for updates");
    expect(result.channels).toEqual(["my-channel"]);
  });
});

describe("analyzeQuery", () => {
  it("extracts stakeholders from natural language", () => {
    const result = analyzeQuery("implement what sarah mentioned about rate limiting");
    expect(result.stakeholders).toContain("sarah");
  });

  it("extracts keywords excluding stop words", () => {
    const result = analyzeQuery("implement what sarah mentioned about rate limiting");
    expect(result.keywords).toContain("rate");
    expect(result.keywords).toContain("limiting");
    expect(result.keywords).not.toContain("what");
    expect(result.keywords).not.toContain("about");
  });

  it("detects specific confidence with stakeholder + keywords", () => {
    const result = analyzeQuery("implement what sarah mentioned about rate limiting");
    expect(result.confidence).toBe("specific");
  });

  it("detects partial confidence with only keywords", () => {
    const result = analyzeQuery("rate limiting");
    expect(result.confidence).toBe("partial");
  });

  it("detects vague confidence with only stop words", () => {
    const result = analyzeQuery("do the thing");
    expect(result.confidence).toBe("vague");
  });

  it("preserves raw query", () => {
    const query = "what sarah said about the API";
    const result = analyzeQuery(query);
    expect(result.rawQuery).toBe(query);
  });

  it("extracts timeframe from 'last week'", () => {
    const result = analyzeQuery("what sarah said last week about auth");
    expect(result.timeframe.after).toBeDefined();
  });

  it("handles explicit date reference", () => {
    const result = analyzeQuery("messages after 2024-01-15");
    expect(result.timeframe.after).toBe("2024-01-15");
  });

  it("returns empty timeframe when none specified", () => {
    const result = analyzeQuery("implement rate limiting");
    expect(result.timeframe.after).toBeUndefined();
    expect(result.timeframe.before).toBeUndefined();
  });

  it("extracts stakeholder from 'from X' pattern", () => {
    const result = analyzeQuery("find messages from lisa about auth tokens");
    expect(result.stakeholders).toContain("lisa");
  });

  it("handles sign up form query", () => {
    const result = analyzeQuery("add the sign up form sarah asked for");
    expect(result.stakeholders).toContain("sarah");
    expect(result.keywords).toContain("sign");
    expect(result.keywords).toContain("form");
  });
});
