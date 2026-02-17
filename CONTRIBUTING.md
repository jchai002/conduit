# Contributing

Thanks for your interest in Conduit. This guide covers the most impactful way to contribute: **adding new providers**.

## Quick Start

```bash
git clone https://github.com/jchai002/conduit.git
cd conduit
npm install
npm run build
```

Press F5 in VS Code to launch the Extension Development Host for testing.

## Project Structure

```
src/
├── providers/
│   ├── types.ts                  # Message, Thread, SearchOptions (shared)
│   ├── businessContextProvider.ts # BusinessContextProvider interface
│   ├── codingAgent.ts            # CodingAgent interface
│   ├── registry.ts               # Provider registry
│   ├── business-context/         # Communication platform adapters
│   │   └── slack/                # Slack implementation
│   └── agents/
│       └── claude-sdk/           # Claude Agent SDK adapter
├── chat/                         # Chat panel, session storage, message protocol
├── webview/                      # HTML template for webview panel
└── extension.ts                  # Entry point
```

## Adding a Context Provider (Slack, Teams, Outlook, Discord, etc.)

This is the highest-impact contribution. The architecture is designed to make this straightforward.

### 1. Create the adapter

Create `src/providers/business-context/<platform>/<platform>Provider.ts` implementing `BusinessContextProvider`:

```typescript
import * as vscode from "vscode";
import { BusinessContextProvider } from "../../businessContextProvider";
import { Message, Thread, SearchOptions } from "../../types";

export class TeamsProvider implements BusinessContextProvider {
  readonly id = "teams";
  readonly displayName = "Microsoft Teams";

  isConfigured(): boolean {
    // Check if the user has set up credentials
  }

  async configure(): Promise<void> {
    // Prompt user for credentials via vscode.window.showInputBox
    // Save to vscode.workspace.getConfiguration("businessContext")
  }

  async searchMessages(options: SearchOptions): Promise<Message[]> {
    // Call platform API, return generic Message[]
    // IMPORTANT: map platform-specific fields to the generic Message type
  }

  async getThread(channelId: string, threadId: string): Promise<Thread | null> {
    // Fetch full thread, return generic Thread
  }
}
```

The key rule: **all platform-specific logic stays inside your provider directory.** The rest of the codebase only sees `Message` and `Thread` from `providers/types.ts`.

> Context providers go in `providers/business-context/`, coding agents go in `providers/agents/`.

### 2. Register the provider

In `src/extension.ts`, add to the `activate` function:

```typescript
import { TeamsProvider } from "./providers/business-context/teams/teamsProvider";

registry.registerContextProvider(new TeamsProvider());
```

### 3. Add the config enum value

In `package.json`, add your provider to the `businessContext.contextProvider` enum:

```json
"businessContext.contextProvider": {
  "enum": ["slack", "teams"],
  "enumDescriptions": ["Slack (via User OAuth Token)", "Microsoft Teams"]
}
```

Add any provider-specific settings under the `businessContext.<platform>.*` namespace:

```json
"businessContext.teams.tenantId": {
  "type": "string",
  "description": "Azure AD Tenant ID for Microsoft Teams access."
}
```

### 4. Add the dependency

Add your platform SDK to `dependencies` in `package.json` (e.g. `@microsoft/microsoft-graph-client`).

That's it. MCP tools are generated automatically — tool names derive from the provider's `id` field (e.g. `search_teams`, `get_teams_thread`).

## Adding a Coding Agent (Codex, Copilot, etc.)

Create `src/providers/agents/<tool>/<tool>Agent.ts` implementing `CodingAgent`:

```typescript
import type { CodingAgent, AgentConversation, ConversationOptions, OnAgentMessage } from "../../codingAgent";

export class CodexAgent implements CodingAgent {
  readonly id = "codex";
  readonly displayName = "OpenAI Codex";

  async isAvailable(): Promise<boolean> { /* Check if CLI is installed */ }
  async isAuthenticated(): Promise<boolean> { /* Check auth status */ }
  isAuthError(text: string): boolean { /* Detect auth errors in output */ }
  getSetupInfo() { return { displayName: "Codex", installCommand: "npm install -g @openai/codex", cliBinaryName: "codex" }; }
  getSetupCommand(): string { return "codex --auth"; }
  resetCache(): void { /* Clear cached binary path */ }

  createConversation(options: ConversationOptions, onMessage: OnAgentMessage): AgentConversation {
    // Create and return a conversation that streams via onMessage callback
  }

  createConversationForResume(options: ConversationOptions, onMessage: OnAgentMessage, existingSessionId: string): AgentConversation {
    // Resume an existing conversation by session ID
  }
}
```

Then register it in `extension.ts` and add to the `businessContext.codingAgent` enum in `package.json`.

## Code Conventions

- TypeScript strict mode
- Named exports only (no default exports)
- Provider-specific settings: `businessContext.<provider>.*`
- Run `npm run build` before submitting — must compile clean

## Submitting a PR

1. Fork the repo
2. Create a feature branch: `git checkout -b add-teams-provider`
3. Make your changes (see above for what files to touch)
4. Run `npm run build` to verify it compiles
5. Open a PR with:
   - Which provider/agent you're adding
   - What API/SDK it uses
   - What auth setup is required for users

## Ideas for Contributions

**Context Providers:**
- Microsoft Teams (Graph API)
- Outlook / Email (Graph API)
- Discord (Discord.js)
- Linear (Linear API)
- Jira (Atlassian REST API)
- Notion (Notion API)
- GitHub Issues / Discussions (GitHub API)

**Coding Agents:**
- GitHub Copilot CLI
- Cursor
- Aider
- Continue

**Core Improvements:**
- Inline code diff viewer with accept/reject in the webview
- Bug reports and feature ideas via GitHub Issues
