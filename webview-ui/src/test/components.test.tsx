/**
 * Component rendering tests using React Testing Library.
 *
 * Tests verify that each component renders the expected HTML structure
 * given certain state, and that user interactions dispatch the right
 * actions / send the right messages to the extension.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockPostMessage } from "./setup";
import { App } from "../App";

/** Helper: render the full app with mocked VS Code API */
function renderApp() {
  const vscodeApi = { postMessage: mockPostMessage };
  return render(<App vscodeApi={vscodeApi} />);
}

describe("WelcomeScreen", () => {
  it("shows welcome screen on initial render", () => {
    renderApp();
    // "Conduit" appears in both Header <h1> and WelcomeScreen <h2>
    const headings = screen.getAllByText("Conduit");
    expect(headings).toHaveLength(2);
    expect(screen.getByText(/Bridge business context/i)).toBeInTheDocument();
  });
});

describe("Header", () => {
  it("renders title, subtitle, and action buttons", () => {
    renderApp();
    expect(screen.getByText("Business context for AI coding")).toBeInTheDocument();
    expect(screen.getByText("No conversation")).toBeInTheDocument();
    expect(screen.getByTitle("Start new conversation")).toBeInTheDocument();
  });
});

describe("InputArea", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("renders textarea with placeholder", () => {
    renderApp();
    const textarea = screen.getByPlaceholderText("Describe what you need...");
    expect(textarea).toBeInTheDocument();
  });

  it("sends query message on first submit", () => {
    renderApp();
    const textarea = screen.getByPlaceholderText("Describe what you need...");
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.click(screen.getByTitle("Send"));
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "query", text: "Hello world" })
    );
  });

  it("clears textarea after sending", () => {
    renderApp();
    const textarea = screen.getByPlaceholderText("Describe what you need...") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.click(screen.getByTitle("Send"));
    expect(textarea.value).toBe("");
  });
});

describe("PermissionToggle", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("renders with default mode label", () => {
    renderApp();
    // Default mode title is "Ask before edits and scripts"
    const toggle = screen.getByTitle("Ask before edits and scripts");
    expect(toggle).toBeInTheDocument();
    // Button text is "🛡 Ask" — split across text nodes, so check textContent
    expect(toggle.textContent).toContain("Ask");
  });
});

describe("StatusBar", () => {
  it("is hidden when statusText is empty", () => {
    renderApp();
    // StatusBar returns null when statusText is empty (initial state)
    const status = document.getElementById("status");
    expect(status).toBeNull();
  });
});
