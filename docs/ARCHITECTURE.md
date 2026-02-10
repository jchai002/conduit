# Architecture

## Problem

Developers receive vague requests like "implement what Sarah mentioned last week" but lack the business context. AI coding tools can implement features but don't know what was discussed in Slack, Teams, or email.

## Solution

A VS Code extension with a conversational chat panel. The AI agent has MCP tools to search business communication and fetch threads on demand, then codes with full context. Multi-turn follow-ups let the developer refine the implementation naturally.

## Two-Path Agent Architecture

Two code paths exist to support different AI tools:

### SDK Path (recommended)

For MCP-capable tools like Claude Code. Uses the Claude Agent SDK with in-process MCP tools. The agent decides when to search — no pre-fetching needed.

```
User types in chat panel
  → ChatPanel creates SDK conversation
  → Claude Agent SDK streams responses
  → Agent calls MCP tools as needed (search_slack, get_slack_thread)
  → MCP tools call BusinessContextProvider methods
  → Multi-turn: user can follow up, agent resumes with full context
  → Messages buffered and persisted to SessionStore
```

Key components:
- `ClaudeSDKAgent` — wraps the Claude Agent SDK, manages conversations
- `createSdkMcpServer()` — in-process MCP server (no separate stdio process)
- `mcpTools.ts` — provider-agnostic MCP tool definitions (tool names derived from provider ID)
- `systemPrompt.ts` — guides when to use/not use business context tools

### Pipeline Path (fallback)

For tools without MCP support (Copilot, Cursor, etc.). One-shot: search → build prompt → execute.

```
User types in chat panel
  → Query Analyzer (extract stakeholders, timeframes, keywords)
  → BusinessContextProvider (search Slack/Teams/Outlook)
  → Disambiguation UI (user picks relevant topic if ambiguous)
  → Thread Fetcher (pull full conversation threads)
  → Context Prompt Builder (format messages into structured prompt)
  → CodingAgent.execute() (tool runs with full context)
```

## Two Abstraction Boundaries

### BusinessContextProvider Interface

Abstracts where business context comes from. Each communication platform implements this interface.

```typescript
interface BusinessContextProvider {
  id: string;              // "slack", "teams", "outlook"
  displayName: string;     // "Slack", "Microsoft Teams"
  isConfigured(): boolean;
  configure(): Promise<void>;
  searchMessages(options: SearchOptions): Promise<Message[]>;
  getThread(channelId: string, threadId: string): Promise<Thread | null>;
}
```

**Current implementations:** Slack
**Planned:** Microsoft Teams, Outlook/Email, Discord, Linear, Jira

Platform-specific logic (API calls, auth, query syntax) stays entirely inside `providers/business-context/<platform>/`. The rest of the codebase only sees `Message` and `Thread`.

### CodingAgent Interface

Abstracts which AI coding tool executes in the pipeline path. Not used by the SDK path.

```typescript
interface CodingAgent {
  id: string;              // "claude-code", "copilot"
  displayName: string;
  isAvailable(): Promise<boolean>;
  execute(options: CodingAgentOptions): Promise<CodingAgentResult>;
}
```

**Current implementations:** Claude Code (CLI subprocess)
**Planned:** GitHub Copilot, Cursor, Aider, Continue

### Generic Data Types

All components communicate through platform-agnostic types:

```typescript
interface Message {
  id: string;
  text: string;
  author: string;
  source: string;      // "slack", "teams", etc.
  channel: string;
  timestamp: string;
  threadId?: string;
  permalink?: string;
}

interface Thread {
  parentMessage: Message;
  replies: Message[];
}
```

## Chat Panel

`ChatPanel` is the bridge between the VS Code extension host and the webview UI. It:

- Routes messages from the webview to the right handler (SDK path or pipeline path)
- Manages SDK conversations and buffers messages for session persistence
- Handles permission requests (Ask / Auto-edit / YOLO modes)
- Restores the most recent session on startup

The routing decision is based on config: `codingAgent === "claude-sdk"` → SDK path, else → pipeline path.

## Session Management

Conversations persist across VS Code restarts via `SessionStore`, backed by `workspaceState`.

- **Two-tier loading:** A lightweight index (`SessionMeta[]`) for fast list rendering; full message history loads lazily on demand
- **Lazy persistence:** Messages buffer during a conversation turn and flush to storage when Claude finishes (`sdk-done`)
- **Session ID migration:** Starts with a UUID, gets replaced with the SDK's real session ID to enable resumption
- **Auto-restore:** On startup, the most recent session loads automatically
- **Max 50 sessions** — oldest auto-deleted on overflow

## Permission System

Three modes, toggled in the input toolbar:

| Mode | Behavior |
|------|----------|
| Ask (default) | Prompt before edits and scripts |
| Auto-edit | Auto-approve file edits, prompt before scripts |
| YOLO | Auto-approve everything |

The SDK's `canUseTool` callback creates a Promise, sends the request to the webview for user approval, and waits for Allow/Deny. 5-minute timeout auto-denies.

## Provider Registration

Providers register on extension activation. The user picks which ones are active via VS Code settings.

```typescript
// extension.ts activate()
registry.registerContextProvider(new SlackProvider());
registry.registerContextProvider(new TeamsProvider());  // future
registry.registerCodingAgent(new ClaudeAgent());
registry.registerCodingAgent(new CopilotAgent());      // future
```

Settings:
```json
{
  "businessContext.contextProvider": "slack",
  "businessContext.codingAgent": "claude-sdk"
}
```

## Query Analysis

The query analyzer is platform-agnostic. It extracts structured search parameters from natural language:

- **Stakeholders:** "Sarah mentioned" → `stakeholders: ["sarah"]`
- **Timeframes:** "last week" → `timeframe: { after: "2026-01-29" }`
- **Keywords:** "rate limiting" → `keywords: ["rate", "limiting"]`
- **Confidence:** vague / partial / specific (determines search strategy)

Each BusinessContextProvider can use this analyzed query however makes sense for its platform. Slack uses it to build `from:` / `after:` / `in:` query syntax. Teams might use Microsoft Graph search filters. The analyzer doesn't need to know.

## Disambiguation

When search results contain multiple unrelated topics, the disambiguation UI clusters messages by thread and presents a multi-select QuickPick. This is platform-agnostic — it works on `Message[]` regardless of source. Used by the pipeline path; the SDK path lets the agent decide relevance on its own.

## Webview Architecture

The chat UI is a React 19 app running inside a VS Code webview panel (sandboxed iframe).

### Two-Pipeline Build

```
Extension:  esbuild  → dist/extension.js  (CJS, Node.js)
Webview:    Vite     → dist/webview.js     (IIFE, browser)
                     → dist/webview.css
```

Both pipelines run from `esbuild.mjs`. The extension build runs first, then Vite builds the webview.

### State Management

React Context + `useReducer`. Single `AppState` object holds all webview state. Actions are prefixed:
- `ext/*` — from extension messages (mapped by `useExtensionMessage` hook)
- `ui/*` — from user interactions (dispatched directly by components)

### Message Protocol

The extension and webview communicate via `postMessage`. Types are shared from `src/chat/messages.ts` via a Vite path alias (`@shared` → `../src/chat/`).

### CSP Compliance

VS Code webviews enforce `default-src 'none'` CSP. All styling uses external CSS files — no CSS-in-JS, no inline styles, no React `style` prop.

### Key Files

```
webview-ui/
├── vite.config.ts        # IIFE output, @shared alias, jsdom test env
├── src/
│   ├── main.tsx          # Entry: acquireVsCodeApi, createRoot
│   ├── App.tsx           # Layout: Header, MessageList, StatusBar, InputArea
│   ├── context/          # State management (reducer, provider, types)
│   ├── hooks/            # useExtensionMessage, usePostMessage, useAutoScroll
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── WelcomeScreen.tsx
│   │   ├── StatusBar.tsx
│   │   ├── PermissionToggle.tsx
│   │   ├── InputArea/          # Textarea + toolbar (permission toggle, send/stop)
│   │   ├── SessionList/        # Past conversation browser
│   │   └── MessageList/        # Chat messages, tool renderers, permissions, todos
│   ├── styles/global.css
│   ├── utils/            # shortenPath, formatRelativeTime
│   └── test/             # Vitest + React Testing Library (57 tests)
src/webview/
└── template.ts           # HTML template for webview panel (used by chatPanel.ts)
```

## Why Users Need Claude Code CLI

The Claude Agent SDK spawns the Claude Code CLI as a subprocess internally — Conduit doesn't manage the process or touch API keys. Users leverage their existing Claude Pro/Max subscriptions (no per-token costs). The CLI provides full access to Claude Code's built-in codebase intelligence, file editing, git operations, and all agent capabilities.

For the pipeline (fallback) path, Claude Code is invoked directly as a CLI subprocess (`claude --print <prompt>`). The same pattern works for other CLI-based tools (aider, etc.).
