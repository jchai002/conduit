/**
 * DataCollector — appends telemetry events to a local JSONL file.
 *
 * This is the core of Conduit's data collection pipeline. It records
 * interaction metadata (tool names, text lengths, timestamps, costs) and
 * Claude's AI outputs (response text, tool call inputs) to a single
 * append-only JSONL file at ~/.conduit/telemetry/sessions.jsonl.
 *
 * What's collected: Claude's responses, tool call inputs, interaction
 * metadata (tool names, text lengths, timestamps, costs, token usage).
 *
 * What's NOT collected: user query text (only length), raw Slack messages,
 * user followup text (only length). We never store what the user typed or
 * what Slack returned — only what Claude produced and interaction metadata.
 *
 * The collector is a no-op when disabled — zero overhead on the hot path.
 * It also respects VS Code's global telemetry setting (telemetry.telemetryLevel).
 *
 * Schema versioned with a `v` field so we can evolve without breaking old files.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

/** Outcome of a completed session — passed to endSession(). */
export interface SessionOutcome {
  outcome: "success" | "error" | "cancelled";
  costUsd?: number;
  durationMs?: number;
  contextWindow?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

/** Base shape for every JSONL record. All events share these fields. */
interface BaseRecord {
  /** Schema version — bump when adding/removing fields. */
  v: 1;
  /** Session ID — groups all events from one conversation. */
  sid: string;
  /** Monotonic sequence number within a session (0, 1, 2, ...). */
  seq: number;
  /** Unix timestamp in milliseconds. */
  ts: number;
  /** Event type discriminator. */
  event: string;
  /** Anonymous device identifier (random UUID, not tied to any user identity). */
  did: string;
}

/**
 * DataCollector — append-only JSONL telemetry writer.
 *
 * Lifecycle:
 * 1. Instantiate with `enabled` flag from settings
 * 2. Call startSession() when a new conversation begins
 * 3. Call recordX() methods from the SDK streaming loop
 * 4. Call endSession() when the conversation finishes
 *
 * If disabled, all methods are instant no-ops.
 */
export class DataCollector {
  private enabled: boolean;
  private currentSessionId: string | null = null;
  private seq = 0;
  /** Count of events recorded since startSession (excluding start/end). */
  private eventCount = 0;
  /** Whether the session_start record has been written yet. Deferred until
   *  the first real event so empty sessions produce no records at all. */
  private sessionStartWritten = false;
  /** Stashed session_start record — written on first real event. */
  private pendingSessionStart: Record<string, unknown> | null = null;

  /** Anonymous device ID — generated once, reused across sessions.
   *  Stored at ~/.conduit/telemetry/device-id to persist across restarts. */
  private deviceId: string;

  /** Full path to the JSONL data file. */
  private dataFilePath: string;

  constructor(enabled: boolean) {
    this.enabled = enabled;

    // Resolve paths
    const dataDir = path.join(os.homedir(), ".conduit", "telemetry");
    this.dataFilePath = path.join(dataDir, "sessions.jsonl");

    // Ensure directory exists
    fs.mkdirSync(dataDir, { recursive: true });

    // Load or generate device ID
    const deviceIdPath = path.join(dataDir, "device-id");
    try {
      this.deviceId = fs.readFileSync(deviceIdPath, "utf-8").trim();
    } catch {
      this.deviceId = crypto.randomUUID();
      fs.writeFileSync(deviceIdPath, this.deviceId, "utf-8");
    }
  }

  // ── Session lifecycle ───────────────────────────────────────

  /** Begin a new telemetry session. Returns the session ID. */
  startSession(opts: { model: string; permissionMode: string }): string {
    const sid = crypto.randomUUID().slice(0, 12);
    this.currentSessionId = sid;
    this.seq = 0;
    this.eventCount = 0;
    this.sessionStartWritten = false;

    // Stash the session_start record — it's only written when the first
    // real event arrives. This prevents empty sessions from producing data.
    this.pendingSessionStart = {
      v: 1, sid, seq: this.seq++, ts: Date.now(), event: "session_start",
      did: this.deviceId, agentPath: "sdk",
      model: opts.model, permissionMode: opts.permissionMode,
    };

    return sid;
  }

  /** End the current telemetry session. Writes a session_end record with
   *  outcome, cost, duration, and token usage. Skips if no events were recorded. */
  endSession(outcome: SessionOutcome): void {
    if (!this.enabled || !this.currentSessionId) return;
    // Don't write anything if no real events happened (empty session)
    if (this.eventCount === 0) {
      this.currentSessionId = null;
      this.pendingSessionStart = null;
      return;
    }
    this.flushPendingStart();
    this.append({
      v: 1, sid: this.currentSessionId, seq: this.seq++, ts: Date.now(),
      event: "session_end", did: this.deviceId,
      outcome: outcome.outcome,
      ...(outcome.costUsd !== undefined ? { costUsd: outcome.costUsd } : {}),
      ...(outcome.durationMs !== undefined ? { durationMs: outcome.durationMs } : {}),
      ...(outcome.contextWindow !== undefined ? { contextWindow: outcome.contextWindow } : {}),
      ...(outcome.inputTokens !== undefined ? { inputTokens: outcome.inputTokens } : {}),
      ...(outcome.outputTokens !== undefined ? { outputTokens: outcome.outputTokens } : {}),
      ...(outcome.cacheReadTokens !== undefined ? { cacheReadTokens: outcome.cacheReadTokens } : {}),
      ...(outcome.cacheCreationTokens !== undefined ? { cacheCreationTokens: outcome.cacheCreationTokens } : {}),
    });
    this.currentSessionId = null;
    this.pendingSessionStart = null;
  }

  // ── Event recording (called from SDK streaming loop) ────────

  /** Record that the user sent a new query. Only stores text length. */
  recordUserQuery(textLength: number): void {
    this.recordEvent({ event: "user_query", textLength });
  }

  /** Record that the user sent a follow-up message. Only stores text length. */
  recordUserFollowup(textLength: number): void {
    this.recordEvent({ event: "user_followup", textLength });
  }

  /** Record Claude's text response. Stores the full AI output text. */
  recordAssistantText(textLength: number, text: string): void {
    this.recordEvent({ event: "assistant_text", textLength, text });
  }

  /** Record a tool call from Claude. Stores tool name and input JSON. */
  recordToolCall(toolName: string, inputLength: number, toolInput: string): void {
    this.recordEvent({ event: "tool_call", toolName, inputLength, toolInput });
  }

  /** Record a tool result returned to Claude. Stores result length and latency. */
  recordToolResult(toolCallId: string, resultLength: number, durationMs: number): void {
    this.recordEvent({ event: "tool_result", toolCallId, resultLength, durationMs });
  }

  // ── Settings ────────────────────────────────────────────────

  /** Update the enabled state at runtime (e.g. user toggled the setting). */
  updateSettings(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Returns the full path to the JSONL data file (for "View Collected Data" command). */
  getDataFilePath(): string {
    return this.dataFilePath;
  }

  /** Delete all collected data and reset the data file. */
  deleteData(): void {
    try {
      fs.unlinkSync(this.dataFilePath);
    } catch {
      // File may not exist — that's fine
    }
  }

  // ── Internals ───────────────────────────────────────────────

  /** Shared logic for all event types. No-ops if disabled or no active session. */
  private recordEvent(fields: Record<string, unknown>): void {
    if (!this.enabled || !this.currentSessionId) return;
    this.flushPendingStart();
    this.eventCount++;
    this.append({
      v: 1, sid: this.currentSessionId, seq: this.seq++, ts: Date.now(),
      did: this.deviceId, ...fields,
    });
  }

  /** Write the deferred session_start record on first real event. */
  private flushPendingStart(): void {
    if (this.pendingSessionStart && !this.sessionStartWritten) {
      this.sessionStartWritten = true;
      this.append(this.pendingSessionStart);
    }
  }

  /** Append a single JSONL line to the data file. Uses appendFileSync for
   *  crash-safety — each line is atomic on POSIX (single write < PIPE_BUF). */
  private append(record: Record<string, unknown>): void {
    try {
      fs.appendFileSync(this.dataFilePath, JSON.stringify(record) + "\n", "utf-8");
    } catch (err) {
      // Don't let telemetry failures crash the extension.
      // Log to console for debugging but never surface to the user.
      console.error("[Conduit] Telemetry write failed:", err);
    }
  }
}
