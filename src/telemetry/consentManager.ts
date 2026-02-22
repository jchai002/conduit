/**
 * ConsentManager — handles telemetry opt-in notifications and settings.
 *
 * Shows a single, non-blocking VS Code notification after the user's first
 * successful conversation (not on install — let them see value first).
 * One click enables collection of both metadata and Claude's AI outputs.
 *
 * Flow:
 * - "Enable" → sets businessContext.telemetry.enabled = true
 * - "What's collected?" → opens TELEMETRY.md, then re-shows the Enable/No thanks prompt
 * - "No thanks" → remembers dismissal in globalState, never asks again
 *
 * Also respects VS Code's global telemetry setting — if telemetry.telemetryLevel
 * is "off", collection is force-disabled regardless of our own setting.
 */
import * as vscode from "vscode";

/** Key used in globalState to track whether the consent prompt was explicitly dismissed. */
const DISMISSED_KEY = "conduit.telemetry.dismissed";
/** Key used in globalState to count how many times the prompt has been shown.
 *  After MAX_PROMPT_SHOWS without an explicit response, stop showing it —
 *  the user clearly isn't interested but didn't bother clicking "No thanks". */
const SHOW_COUNT_KEY = "conduit.telemetry.showCount";
const MAX_PROMPT_SHOWS = 3;

export class ConsentManager {
  constructor(private context: vscode.ExtensionContext) {}

  /** Returns true if telemetry collection is currently enabled.
   *  Checks both our setting AND VS Code's global telemetry level. */
  isEnabled(): boolean {
    // Respect VS Code's global telemetry setting — users who turned off
    // all telemetry have a clear intent we should honor.
    const vscodeLevel = vscode.workspace.getConfiguration("telemetry")
      .get<string>("telemetryLevel", "all");
    if (vscodeLevel === "off") return false;

    return vscode.workspace.getConfiguration("businessContext")
      .get<boolean>("telemetry.enabled", false);
  }

  /** Show the consent notification if appropriate. Call after the first
   *  successful conversation completes (sdk-done with success). */
  async maybeShowPrompt(): Promise<void> {
    // Already enabled — nothing to ask
    if (this.isEnabled()) return;

    // Already dismissed — never nag
    if (this.context.globalState.get<boolean>(DISMISSED_KEY)) return;

    // Shown too many times without a response — treat as implicit "no"
    const showCount = this.context.globalState.get<number>(SHOW_COUNT_KEY, 0);
    if (showCount >= MAX_PROMPT_SHOWS) return;

    await this.context.globalState.update(SHOW_COUNT_KEY, showCount + 1);

    const choice = await vscode.window.showInformationMessage(
      "Help improve Conduit? We'd collect anonymous usage patterns and AI responses " +
      "to train better context search. Never your Slack messages.",
      "Enable",
      "What's collected?",
      "No thanks",
    );

    if (choice === "Enable") {
      await vscode.workspace.getConfiguration("businessContext")
        .update("telemetry.enabled", true, vscode.ConfigurationTarget.Global);
    } else if (choice === "What's collected?") {
      // Open the user-facing telemetry doc so they can read what's collected
      const docUri = vscode.Uri.joinPath(
        this.context.extensionUri, "docs", "TELEMETRY.md"
      );
      try {
        await vscode.commands.executeCommand("markdown.showPreview", docUri);
      } catch {
        // Fallback: open as plain text if markdown preview isn't available
        const doc = await vscode.workspace.openTextDocument(docUri);
        await vscode.window.showTextDocument(doc);
      }
      // Re-show a follow-up prompt so the user can still Enable or dismiss
      // after reading. VS Code notifications are one-shot — clicking any
      // button dismisses them. Without this, "What's collected?" would
      // effectively mean "ask me again next conversation" which feels broken.
      await this.showEnablePrompt();
    } else if (choice === "No thanks") {
      // Explicit rejection — remember it and never ask again
      await this.context.globalState.update(DISMISSED_KEY, true);
    }
    // else: undefined = notification timed out or was closed via X.
    // Don't mark as dismissed — re-show on the next conversation completion.
    // This gives users who were busy a chance to respond next time.
  }

  /** Simplified follow-up prompt shown after the user reads the telemetry doc.
   *  Two choices only — they've already seen the full explanation. */
  private async showEnablePrompt(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      "Enable anonymous data collection for Conduit?",
      "Enable",
      "No thanks",
    );

    if (choice === "Enable") {
      await vscode.workspace.getConfiguration("businessContext")
        .update("telemetry.enabled", true, vscode.ConfigurationTarget.Global);
    } else if (choice === "No thanks") {
      await this.context.globalState.update(DISMISSED_KEY, true);
    }
    // else: timed out / closed — re-show next time
  }
}
