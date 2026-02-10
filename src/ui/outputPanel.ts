import * as vscode from "vscode";

/**
 * Manages a VS Code output channel for displaying results
 * and a webview panel for rich formatted output.
 */

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("Conduit");
  }
  return outputChannel;
}

export function appendOutput(text: string): void {
  const channel = getOutputChannel();
  channel.append(text);
}

export function appendOutputLine(text: string): void {
  const channel = getOutputChannel();
  channel.appendLine(text);
}

export function showOutput(): void {
  const channel = getOutputChannel();
  channel.show(true);
}

export function clearOutput(): void {
  const channel = getOutputChannel();
  channel.clear();
}

/**
 * Show a progress notification while running an async operation.
 */
export async function withProgress<T>(
  title: string,
  task: (
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: true,
    },
    task
  );
}
