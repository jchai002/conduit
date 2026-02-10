import { describe, it, expect, beforeEach } from "vitest";
import { SessionStore, Memento, StoredMessage } from "../chat/sessionStore";

class MockMemento implements Memento {
  private store = new Map<string, unknown>();

  get<T>(key: string, defaultValue?: T): T {
    if (this.store.has(key)) return this.store.get(key) as T;
    return defaultValue as T;
  }

  update(key: string, value: unknown): Thenable<void> {
    if (value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, JSON.parse(JSON.stringify(value)));
    }
    return Promise.resolve();
  }
}

describe("SessionStore", () => {
  let memento: MockMemento;
  let store: SessionStore;

  beforeEach(() => {
    memento = new MockMemento();
    store = new SessionStore(memento);
  });

  it("starts with empty index", () => {
    expect(store.getIndex()).toEqual([]);
  });

  it("creates a session", () => {
    const meta = store.createSession("sess-1", "Hello world");
    expect(meta.sessionId).toBe("sess-1");
    expect(meta.title).toBe("Hello world");
    expect(meta.messageCount).toBe(0);
    expect(meta.createdAt).toBeGreaterThan(0);

    const index = store.getIndex();
    expect(index).toHaveLength(1);
    expect(index[0].sessionId).toBe("sess-1");

    const data = store.getSession("sess-1");
    expect(data).toBeDefined();
    expect(data!.messages).toEqual([]);
  });

  it("truncates title to 80 chars", () => {
    const longTitle = "a".repeat(120);
    const meta = store.createSession("sess-1", longTitle);
    expect(meta.title).toHaveLength(80);
  });

  it("appends messages to a session", () => {
    store.createSession("sess-1", "Test");

    const messages: StoredMessage[] = [
      { role: "user", text: "hello", timestamp: 1000 },
      { role: "assistant", text: "hi there", timestamp: 2000 },
    ];

    store.appendMessages("sess-1", messages);

    const data = store.getSession("sess-1");
    expect(data!.messages).toHaveLength(2);
    expect(data!.meta.messageCount).toBe(2);

    const index = store.getIndex();
    expect(index[0].messageCount).toBe(2);
  });

  it("does nothing when appending to non-existent session", () => {
    store.appendMessages("no-such-id", [
      { role: "user", text: "hello", timestamp: 1000 },
    ]);
    expect(store.getSession("no-such-id")).toBeUndefined();
  });

  it("does nothing when appending empty messages", () => {
    store.createSession("sess-1", "Test");
    store.appendMessages("sess-1", []);
    const data = store.getSession("sess-1");
    expect(data!.messages).toHaveLength(0);
  });

  it("moves updated session to front of index", () => {
    store.createSession("sess-1", "First");
    store.createSession("sess-2", "Second");

    // sess-2 is at front after creation
    expect(store.getIndex()[0].sessionId).toBe("sess-2");

    // Append to sess-1 — should move it to front
    store.appendMessages("sess-1", [
      { role: "user", text: "update", timestamp: 3000 },
    ]);

    expect(store.getIndex()[0].sessionId).toBe("sess-1");
    expect(store.getIndex()[1].sessionId).toBe("sess-2");
  });

  it("updates session ID", () => {
    store.createSession("temp-id", "Test query");
    store.appendMessages("temp-id", [
      { role: "user", text: "hello", timestamp: 1000 },
    ]);

    store.updateSessionId("temp-id", "real-sdk-id");

    // Old ID should be gone
    expect(store.getSession("temp-id")).toBeUndefined();

    // New ID should have the data
    const data = store.getSession("real-sdk-id");
    expect(data).toBeDefined();
    expect(data!.meta.sessionId).toBe("real-sdk-id");
    expect(data!.messages).toHaveLength(1);

    // Index should reflect new ID
    const index = store.getIndex();
    expect(index[0].sessionId).toBe("real-sdk-id");
    expect(index.find((s) => s.sessionId === "temp-id")).toBeUndefined();
  });

  it("deletes a session", () => {
    store.createSession("sess-1", "First");
    store.createSession("sess-2", "Second");

    store.deleteSession("sess-1");

    expect(store.getSession("sess-1")).toBeUndefined();
    const index = store.getIndex();
    expect(index).toHaveLength(1);
    expect(index[0].sessionId).toBe("sess-2");
  });

  it("enforces 50 session cap", () => {
    for (let i = 0; i < 55; i++) {
      store.createSession(`sess-${i}`, `Session ${i}`);
    }

    const index = store.getIndex();
    expect(index).toHaveLength(50);

    // Most recent should be at front
    expect(index[0].sessionId).toBe("sess-54");

    // Oldest should have been removed
    expect(store.getSession("sess-0")).toBeUndefined();
    expect(store.getSession("sess-4")).toBeUndefined();
    expect(store.getSession("sess-5")).toBeDefined();
  });

  it("getSession returns undefined for unknown ID", () => {
    expect(store.getSession("nonexistent")).toBeUndefined();
  });
});
