/**
 * SyncService — periodically uploads local telemetry data to S3.
 *
 * Reads new JSONL lines from ~/.conduit/telemetry/sessions.jsonl (using a
 * byte offset to avoid re-uploading old data) and uploads them via a
 * pre-signed S3 URL obtained from a backend API.
 *
 * The upload flow:
 * 1. Read sessions.jsonl from the last synced byte offset to EOF
 * 2. POST to the upload-url endpoint with deviceId + date → get pre-signed URL
 * 3. PUT the JSONL chunk directly to S3 via the pre-signed URL
 * 4. Update the byte offset in sync-state.json
 *
 * Runs on a timer (every 6 hours) and can be triggered manually.
 * Silently skips if offline, disabled, or no new data exists.
 *
 * Data is partitioned in S3 as: {deviceId}/{date}.jsonl
 * This makes per-device deletion trivial for GDPR compliance.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

/** How often to sync (in milliseconds). 6 hours. */
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Sync state persisted between runs — tracks how much data has been uploaded. */
interface SyncState {
  lastSyncByteOffset: number;
}

export class SyncService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private dataDir: string;
  private dataFilePath: string;
  private syncStatePath: string;
  private deviceIdPath: string;

  constructor() {
    this.dataDir = path.join(os.homedir(), ".conduit", "telemetry");
    this.dataFilePath = path.join(this.dataDir, "sessions.jsonl");
    this.syncStatePath = path.join(this.dataDir, "sync-state.json");
    this.deviceIdPath = path.join(this.dataDir, "device-id");
  }

  /** Start the periodic sync timer. Call once from extension activation. */
  start(): void {
    // Run an initial sync after a short delay (don't block activation)
    setTimeout(() => this.syncIfEnabled(), 30_000);

    this.timer = setInterval(() => this.syncIfEnabled(), SYNC_INTERVAL_MS);
  }

  /** Stop the periodic sync timer. Call from extension deactivation. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Attempt a final sync on deactivation. Best-effort — VS Code gives ~5s. */
  async syncOnDeactivate(): Promise<void> {
    this.stop();
    await this.syncIfEnabled();
  }

  /** Manual sync trigger (for the "Conduit: Sync Now" command). */
  async syncNow(): Promise<void> {
    if (!this.isSyncEnabled()) {
      vscode.window.showInformationMessage(
        "Telemetry sync is not enabled. Enable it in settings: businessContext.telemetry.syncEnabled"
      );
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Syncing telemetry data..." },
      () => this.performSync()
    );
  }

  // ── Internals ───────────────────────────────────────────────

  /** Check settings and sync if enabled. Silently no-ops otherwise. */
  private async syncIfEnabled(): Promise<void> {
    if (!this.isSyncEnabled()) return;
    try {
      await this.performSync();
    } catch (err) {
      console.error("[Conduit] Telemetry sync failed:", err);
    }
  }

  private isSyncEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("businessContext");
    return config.get<boolean>("telemetry.enabled", false) &&
           config.get<boolean>("telemetry.syncEnabled", false);
  }

  /** Core sync logic — reads new data and uploads to S3 via pre-signed URL. */
  private async performSync(): Promise<void> {
    // Read the data file — bail if it doesn't exist or is empty
    if (!fs.existsSync(this.dataFilePath)) return;
    const stat = fs.statSync(this.dataFilePath);
    if (stat.size === 0) return;

    // Load sync state — start from the last synced byte offset
    const syncState = this.loadSyncState();
    if (syncState.lastSyncByteOffset >= stat.size) return; // nothing new

    // Read new data from the byte offset to EOF
    const fd = fs.openSync(this.dataFilePath, "r");
    const buffer = Buffer.alloc(stat.size - syncState.lastSyncByteOffset);
    fs.readSync(fd, buffer, 0, buffer.length, syncState.lastSyncByteOffset);
    fs.closeSync(fd);
    const newData = buffer.toString("utf-8");

    if (!newData.trim()) return; // no meaningful content

    // Load device ID
    let deviceId: string;
    try {
      deviceId = fs.readFileSync(this.deviceIdPath, "utf-8").trim();
    } catch {
      console.error("[Conduit] No device ID found — skipping sync");
      return;
    }

    // Get pre-signed upload URL from backend
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const uploadUrl = await this.getPresignedUrl(deviceId, today);
    if (!uploadUrl) return;

    // Upload directly to S3
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/x-ndjson" },
      body: newData,
    });

    if (!response.ok) {
      console.error(`[Conduit] S3 upload failed: ${response.status} ${response.statusText}`);
      return;
    }

    // Success — advance the byte offset
    this.saveSyncState({ lastSyncByteOffset: stat.size });
    console.log(`[Conduit] Telemetry synced: ${buffer.length} bytes uploaded`);
  }

  /** Requests a pre-signed S3 PUT URL from the backend API.
   *  Returns null if the request fails (offline, server error, etc.). */
  private async getPresignedUrl(deviceId: string, date: string): Promise<string | null> {
    // TODO: Replace with actual backend URL when the Cloudflare Worker
    // endpoint is set up. For now, the sync service is wired up but
    // uploads will silently fail until the backend exists.
    const apiUrl = vscode.workspace.getConfiguration("businessContext")
      .get<string>("telemetry.syncUrl", "");

    if (!apiUrl) {
      console.log("[Conduit] No telemetry sync URL configured — skipping upload");
      return null;
    }

    try {
      const response = await fetch(`${apiUrl}/telemetry/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, date }),
      });

      if (!response.ok) {
        console.error(`[Conduit] Failed to get upload URL: ${response.status}`);
        return null;
      }

      const data = await response.json() as { presignedUrl?: string };
      return data.presignedUrl ?? null;
    } catch (err) {
      console.error("[Conduit] Failed to get upload URL:", err);
      return null;
    }
  }

  private loadSyncState(): SyncState {
    try {
      const raw = fs.readFileSync(this.syncStatePath, "utf-8");
      return JSON.parse(raw) as SyncState;
    } catch {
      return { lastSyncByteOffset: 0 };
    }
  }

  private saveSyncState(state: SyncState): void {
    fs.writeFileSync(this.syncStatePath, JSON.stringify(state), "utf-8");
  }
}
