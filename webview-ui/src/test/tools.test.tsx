/**
 * Tests for tool renderer components.
 *
 * Each tool renderer parses JSON input and renders a specialized view.
 * Tests verify the rendered output matches the expected structure.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditTool } from "../components/MessageList/tools/EditTool";
import { WriteTool } from "../components/MessageList/tools/WriteTool";
import { BashTool } from "../components/MessageList/tools/BashTool";
import { ReadTool } from "../components/MessageList/tools/ReadTool";
import { GlobTool } from "../components/MessageList/tools/GlobTool";
import { GrepTool } from "../components/MessageList/tools/GrepTool";
import { GenericTool } from "../components/MessageList/tools/GenericTool";
import type { ToolCall } from "../context/types";

/** Helper: create a ToolCall object */
function makeTool(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: "t1",
    kind: "tool-call",
    toolCallId: "tc1",
    toolName: "Generic",
    input: "{}",
    ...overrides,
  };
}

describe("EditTool", () => {
  it("renders diff with removed and added lines", () => {
    const tool = makeTool({
      toolName: "Edit",
      input: JSON.stringify({
        file_path: "/home/user/src/chat/messages.ts",
        old_string: "const x = 1;",
        new_string: "const x = 2;",
      }),
    });
    render(<EditTool tool={tool} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText(/messages\.ts/)).toBeInTheDocument();
    expect(screen.getByText(/- const x = 1;/)).toBeInTheDocument();
    expect(screen.getByText(/\+ const x = 2;/)).toBeInTheDocument();
  });

  it("shows running placeholder when no result", () => {
    const tool = makeTool({ toolName: "Edit", input: '{"file_path":"f","old_string":"a","new_string":"b"}' });
    render(<EditTool tool={tool} />);
    expect(screen.getByText("running...")).toBeInTheDocument();
  });

  it("shows tool result when available", () => {
    const tool = makeTool({
      toolName: "Edit",
      input: '{"file_path":"f","old_string":"a","new_string":"b"}',
      result: "OK: edited file",
    });
    render(<EditTool tool={tool} />);
    expect(screen.getByText("OK: edited file")).toBeInTheDocument();
  });
});

describe("WriteTool", () => {
  it("renders file path with (new) suffix", () => {
    const tool = makeTool({
      toolName: "Write",
      input: JSON.stringify({ file_path: "/src/newfile.ts", content: "hello\nworld" }),
    });
    render(<WriteTool tool={tool} />);
    expect(screen.getByText(/newfile\.ts.*\(new\)/)).toBeInTheDocument();
  });

  it("shows all lines as added", () => {
    const tool = makeTool({
      toolName: "Write",
      input: JSON.stringify({ file_path: "/f.ts", content: "line1\nline2" }),
    });
    const { container } = render(<WriteTool tool={tool} />);
    const added = container.querySelectorAll(".diff-added");
    expect(added.length).toBe(2);
  });
});

describe("BashTool", () => {
  it("renders command with $ prompt", () => {
    const tool = makeTool({
      toolName: "Bash",
      input: JSON.stringify({ command: "npm install", description: "Install deps" }),
    });
    render(<BashTool tool={tool} />);
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText("npm install")).toBeInTheDocument();
    expect(screen.getByText("Install deps")).toBeInTheDocument();
  });

  it("uses 'Bash' as default label when no description", () => {
    const tool = makeTool({
      toolName: "Bash",
      input: JSON.stringify({ command: "ls" }),
    });
    render(<BashTool tool={tool} />);
    expect(screen.getByText("Bash")).toBeInTheDocument();
  });
});

describe("ReadTool", () => {
  it("renders file path and reading placeholder", () => {
    const tool = makeTool({
      toolName: "Read",
      input: JSON.stringify({ file_path: "/src/chat/messages.ts" }),
    });
    render(<ReadTool tool={tool} />);
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText(/messages\.ts/)).toBeInTheDocument();
    expect(screen.getByText("reading...")).toBeInTheDocument();
  });

  it("shows line range info when offset and limit provided", () => {
    const tool = makeTool({
      toolName: "Read",
      input: JSON.stringify({ file_path: "/f.ts", offset: 10, limit: 50 }),
    });
    render(<ReadTool tool={tool} />);
    expect(screen.getByText(/line 10, 50 lines/)).toBeInTheDocument();
  });
});

describe("GlobTool", () => {
  it("renders glob pattern", () => {
    const tool = makeTool({
      toolName: "Glob",
      input: JSON.stringify({ pattern: "**/*.ts", path: "/src" }),
    });
    render(<GlobTool tool={tool} />);
    expect(screen.getByText("Glob")).toBeInTheDocument();
    expect(screen.getByText(/\*\*\/\*\.ts/)).toBeInTheDocument();
  });
});

describe("GrepTool", () => {
  it("renders grep pattern with slashes", () => {
    const tool = makeTool({
      toolName: "Grep",
      input: JSON.stringify({ pattern: "TODO", glob: "*.ts" }),
    });
    render(<GrepTool tool={tool} />);
    expect(screen.getByText("Grep")).toBeInTheDocument();
    expect(screen.getByText(/\/TODO\//)).toBeInTheDocument();
  });
});

describe("GenericTool", () => {
  it("renders tool name and raw JSON input", () => {
    const tool = makeTool({
      toolName: "CustomMCP",
      input: '{"key":"value"}',
    });
    render(<GenericTool tool={tool} />);
    expect(screen.getByText("CustomMCP")).toBeInTheDocument();
    expect(screen.getByText('{"key":"value"}')).toBeInTheDocument();
  });
});
