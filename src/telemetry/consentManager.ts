/**
 * ConsentManager — handles telemetry opt-in notifications and settings.
 *
 * Shows a single, non-blocking VS Code notification after the user's first
 * successful conversation (not on install — let them see value first).
 * One click enables collection of both metadata and Claude's AI outputs.
 *
 * The notification is shown at most once:
 * - "Enable" → sets businessContext.telemetry.enabled = true
 * - "What's collected?" → opens the data collection plan doc
 * - "No thanks" → remembers dismissal in globalState, never asks again
 *
 * Also respects VS Code's global telemetry setting — if telemetry.telemetryLevel
 * is "off", collection is force-disabled regardless of our own setting.
 */
import * as vscode from "vscode";

/** Key used in globalState to track whether the consent prompt was dismissed. */
const DISMISSED_KEY = "conduit.telemetry.dismissed";

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
      // Open the data collection plan for full transparency
      const docUri = vscode.Uri.joinPath(
        this.context.extensionUri, "plans", "data-collection-plan.md"
      );
      try {
        await vscode.commands.executeCommand("markdown.showPreview", docUri);
      } catch {
        // Fallback: open as plain text if markdown preview isn't available
        const doc = await vscode.workspace.openTextDocument(docUri);
        await vscode.window.showTextDocument(doc);
      }
    } else {
      // "No thanks" or dismissed the notification
      await this.context.globalState.update(DISMISSED_KEY, true);
    }
  }
}
