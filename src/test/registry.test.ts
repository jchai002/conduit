import { describe, it, expect } from "vitest";
import { ProviderRegistry } from "../providers/registry";
import { BusinessContextProvider } from "../providers/businessContextProvider";
import { CodingAgent } from "../providers/codingAgent";

const fakeProvider = (id: string): BusinessContextProvider => ({
  id,
  displayName: `Provider ${id}`,
  isConfigured: () => true,
  configure: async () => {},
  searchMessages: async () => [],
  getThread: async () => null,
});

const fakeAgent = (id: string): CodingAgent => ({
  id,
  displayName: `Agent ${id}`,
  isAvailable: async () => true,
  execute: async () => ({ success: true, output: "" }),
});

describe("ProviderRegistry", () => {
  it("registers and retrieves a context provider", () => {
    const registry = new ProviderRegistry();
    const provider = fakeProvider("slack");
    registry.registerBusinessContext(provider);
    expect(registry.getBusinessContext("slack")).toBe(provider);
  });

  it("registers and retrieves a coding agent", () => {
    const registry = new ProviderRegistry();
    const agent = fakeAgent("claude-code");
    registry.registerCodingAgent(agent);
    expect(registry.getCodingAgent("claude-code")).toBe(agent);
  });

  it("returns undefined for unknown provider", () => {
    const registry = new ProviderRegistry();
    expect(registry.getBusinessContext("nonexistent")).toBeUndefined();
  });

  it("returns undefined for unknown agent", () => {
    const registry = new ProviderRegistry();
    expect(registry.getCodingAgent("nonexistent")).toBeUndefined();
  });

  it("lists all providers", () => {
    const registry = new ProviderRegistry();
    registry.registerBusinessContext(fakeProvider("slack"));
    registry.registerBusinessContext(fakeProvider("mock"));
    const all = registry.getAllBusinessContextProviders();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id)).toEqual(["slack", "mock"]);
  });

  it("lists all agents", () => {
    const registry = new ProviderRegistry();
    registry.registerCodingAgent(fakeAgent("claude-code"));
    registry.registerCodingAgent(fakeAgent("mock"));
    const all = registry.getAllCodingAgents();
    expect(all).toHaveLength(2);
  });

  it("overwrites provider with same id", () => {
    const registry = new ProviderRegistry();
    const v1 = fakeProvider("slack");
    const v2 = fakeProvider("slack");
    registry.registerBusinessContext(v1);
    registry.registerBusinessContext(v2);
    expect(registry.getBusinessContext("slack")).toBe(v2);
    expect(registry.getAllBusinessContextProviders()).toHaveLength(1);
  });
});
