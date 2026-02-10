/**
 * Persistent conversation session storage backed by VS Code's workspaceState.
 *
 * workspaceState is a key-value store that VS Code persists per-workspace.
 * It survives VS Code restarts, but is NOT synced across machines.
 *
 * Storage strategy:
 * - A lightweight index (SessionMeta[]) for fast list rendering
 * - Individual session data (messages) loaded lazily on demand
 * - Tool call inputs truncated to 2KB, tool results to 200 chars
 * - Max 50 sessions — oldest auto-deleted on overflow
 *
 * This keeps total storage well under 1MB even with heavy use.
 */

/** Discriminated union — each role has exactly the fields it needs.
 *  TypeScript narrows the type when you switch on `role`. */
export type StoredMessage =
  | { role: "user"; text: string; timestamp: number }
  | { role: "assistant"; text: string; timestamp: number }
  | { role: "tool-call"; text: string; toolName: string; toolCallId: string; timestamp: number }
  | { role: "tool-result"; text: string; toolCallId: string; timestamp: number }
  | { role: "info"; text: string; timestamp: number }
  | { role: "error"; text: string; timestamp: number };

export interface SessionMeta {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface SessionData {
  meta: SessionMeta;
  messages: StoredMessage[];
}

/** Minimal subset of vscode.Memento used by SessionStore. */
export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Thenable<void>;
}

const INDEX_KEY = "conduit.sessionIndex";
const SESSION_KEY_PREFIX = "conduit.session.";
const MAX_SESSIONS = 50;

export class SessionStore {
  constructor(private state: Memento) {}

  getIndex(): SessionMeta[] {
    return this.state.get<SessionMeta[]>(INDEX_KEY, []);
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.state.get<SessionData>(SESSION_KEY_PREFIX + sessionId);
  }

  createSession(sessionId: string, title: string): SessionMeta {
    const now = Date.now();
    const meta: SessionMeta = {
      sessionId,
      title: title.slice(0, 80),
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    const data: SessionData = { meta, messages: [] };

    const index = this.getIndex();
    index.unshift(meta);

    // Enforce cap — delete oldest sessions beyond limit
    while (index.length > MAX_SESSIONS) {
      const removed = index.pop()!;
      this.state.update(SESSION_KEY_PREFIX + removed.sessionId, undefined);
    }

    this.state.update(INDEX_KEY, index);
    this.state.update(SESSION_KEY_PREFIX + sessionId, data);

    return meta;
  }

  appendMessages(sessionId: string, messages: StoredMessage[]): void {
    if (messages.length === 0) return;

    const data = this.getSession(sessionId);
    if (!data) return;

    data.messages.push(...messages);
    data.meta.messageCount = data.messages.length;
    data.meta.updatedAt = Date.now();

    this.state.update(SESSION_KEY_PREFIX + sessionId, data);

    // Update index entry
    const index = this.getIndex();
    const entry = index.find((s) => s.sessionId === sessionId);
    if (entry) {
      entry.messageCount = data.meta.messageCount;
      entry.updatedAt = data.meta.updatedAt;
      // Move to front (most recent)
      const idx = index.indexOf(entry);
      if (idx > 0) {
        index.splice(idx, 1);
        index.unshift(entry);
      }
    }
    this.state.update(INDEX_KEY, index);
  }

  updateSessionId(oldId: string, newId: string): void {
    const data = this.getSession(oldId);
    if (!data) return;

    // Update the session data
    data.meta.sessionId = newId;
    this.state.update(SESSION_KEY_PREFIX + newId, data);
    this.state.update(SESSION_KEY_PREFIX + oldId, undefined);

    // Update the index entry
    const index = this.getIndex();
    const entry = index.find((s) => s.sessionId === oldId);
    if (entry) {
      entry.sessionId = newId;
    }
    this.state.update(INDEX_KEY, index);
  }

  deleteSession(sessionId: string): void {
    this.state.update(SESSION_KEY_PREFIX + sessionId, undefined);

    const index = this.getIndex();
    const filtered = index.filter((s) => s.sessionId !== sessionId);
    this.state.update(INDEX_KEY, filtered);
  }
}
