# Changelog

## 0.1.0 — Alpha Release

First public release of Tether.

### Features

- **Slack context provider** — search messages, fetch threads, resolve users and channels via Slack User OAuth Token
- **Claude Agent SDK integration** — multi-turn agentic conversations with streaming, session resume, and model selection
- **In-process MCP tools** — `search_slack`, `get_slack_thread`, `resolve_slack_user`, `resolve_slack_channel` (no separate server needed)
- **CodingAgent abstraction** — agent-agnostic interface; chatPanel programs against the abstract contract
- **Chat webview** — React 19 UI with tool call/result rendering, follow-ups, session list, and session restore
- **Permission system** — Ask / Auto-edit / YOLO modes with per-tool approval
- **Session persistence** — conversations persist across VS Code restarts via workspaceState
- **Slack OAuth flow** — one-click connect via Cloudflare Worker proxy
- **Telemetry** — opt-in local usage logging with optional anonymous upload
