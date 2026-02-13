import { spawn, ChildProcess } from "child_process";
import { CodingAgent, CodingAgentOptions, CodingAgentResult } from "../../codingAgent";

export class ClaudeAgent implements CodingAgent {
  readonly id = "claude-code";
  readonly displayName = "Claude Code";

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const child = spawn("claude", ["--version"], { shell: true });
        child.on("close", (code) => resolve(code === 0));
        child.on("error", () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  async execute(options: CodingAgentOptions): Promise<CodingAgentResult> {
    const { prompt, workingDirectory, onOutput, onError } = options;

    return new Promise((resolve) => {
      const args = ["--print", prompt];

      let child: ChildProcess;
      try {
        child = spawn("claude", args, {
          cwd: workingDirectory,
          env: { ...process.env } as Record<string, string>,
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (err: any) {
        resolve({
          success: false,
          output: "",
          error: `Failed to spawn Claude Code CLI: ${err.message}. Is 'claude' installed and in PATH?`,
        });
        return;
      }

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        onOutput?.(text);
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        onError?.(text);
      });

      child.on("error", (err) => {
        resolve({
          success: false,
          output: stdout,
          error: `Claude Code CLI error: ${err.message}`,
        });
      });

      child.on("close", (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr || `Claude Code exited with code ${code}` : undefined,
        });
      });
    });
  }
}
