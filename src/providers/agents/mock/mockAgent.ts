import {
  CodingAgent,
  CodingAgentOptions,
  CodingAgentResult,
} from "../../codingAgent";

export class MockAgent implements CodingAgent {
  readonly id = "mock";
  readonly displayName = "Mock Agent (Echo)";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async execute(options: CodingAgentOptions): Promise<CodingAgentResult> {
    const output = [
      "=== Mock Agent ===",
      "Received prompt:",
      "",
      options.prompt,
      "",
      `Working directory: ${options.workingDirectory}`,
      "",
      "Mock agent does not modify any files. Use a real agent (e.g. Claude Code) for actual implementation.",
    ].join("\n");

    if (options.onOutput) {
      // Stream output line by line to simulate real agent behavior
      for (const line of output.split("\n")) {
        options.onOutput(line);
      }
    }

    return {
      success: true,
      output,
    };
  }
}
