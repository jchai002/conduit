/**
 * Interface for any LLM coding tool (Claude Code, Copilot, Cursor, etc.).
 * Each implementation wraps the specific tool's CLI or SDK.
 */

export interface CodingAgentOptions {
  prompt: string;
  workingDirectory: string;
  onOutput?: (text: string) => void;
  onError?: (text: string) => void;
}

export interface CodingAgentResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface CodingAgent {
  readonly id: string;
  readonly displayName: string;

  isAvailable(): Promise<boolean>;
  execute(options: CodingAgentOptions): Promise<CodingAgentResult>;
}
