# Conduit

A VS Code extension that gives AI coding tools direct access to your team's business communication — Slack, Teams, Jira, and more.

## What it does

Developers receive vague requests like "implement what Sarah mentioned last week" but lack the business context. Conduit connects your communication platforms to your AI coding tool via MCP (Model Context Protocol), so the AI agent can search messages and fetch threads on its own — pulling exactly the context it needs, when it needs it.

Type naturally in the chat panel:

> "Implement what Sarah mentioned last week about rate limiting"

The AI agent searches your Slack (or other connected platform), reads the relevant threads, and starts coding with full context.

## Quick Start

1. Install the extension
2. Install [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)
3. Configure your Slack token: `Conduit: Configure`
4. Open the chat panel and start typing

## How it works

Conduit runs a conversational chat panel inside VS Code. When you type a query, the Claude Agent SDK starts a multi-turn conversation with MCP tools for searching your business communication. The agent decides when to search, what threads to pull, and how to use the context — all within a natural conversation where you can ask follow-ups.

Sessions persist across restarts. Your most recent conversation loads automatically when you open the panel.

### Two-path architecture

- **SDK path** (recommended): Uses the Claude Agent SDK with in-process MCP. Multi-turn, conversational, the agent searches on its own.
- **Pipeline path** (fallback): For coding tools without MCP support. One-shot: search → build prompt → execute.

## Supported Platforms

**Context Providers:**
- Slack (via User OAuth Token)
- More coming — see [CONTRIBUTING.md](CONTRIBUTING.md)

**Coding Agents:**
- Claude Code (via Claude Agent SDK — recommended)
- Claude Code (CLI subprocess — fallback)
- More coming — see [CONTRIBUTING.md](CONTRIBUTING.md)

## Contributing

Conduit is built on a provider architecture that makes adding new platforms straightforward. See [CONTRIBUTING.md](CONTRIBUTING.md) for a step-by-step guide.

## License

MIT
