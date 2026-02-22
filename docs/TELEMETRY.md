# What Conduit Collects

Conduit logs anonymous usage data locally to improve context search quality. If you enable sharing, this data is periodically uploaded to help train better models.

## What's Included

Conduit records the following locally:

- **AI responses** — Claude's text output (summaries, analysis, implementation plans)
- **Tool call metadata** — which tools Claude used and what it searched for (e.g. `search_slack` with query `"rate limiting from:sarah"`)
- **Interaction metadata** — tool names, text lengths, timestamps, token usage, session cost
- **Anonymous device ID** — a random UUID, not tied to your name, email, or any account

## What's NOT Included

- **Your messages** — we never store what you type. Only the character count.
- **Slack messages** — raw messages from Slack/Teams are never recorded
- **Personal identity** — no email, name, username, or account information
- **Code content** — we don't record file contents, diffs, or code from your workspace

## Example Data

Each session produces records like this (one JSON line per event):

```json
{"v":1, "sid":"a1b2c3", "seq":0, "event":"session_start", "model":"claude-opus-4-6"}
{"v":1, "sid":"a1b2c3", "seq":1, "event":"user_query", "textLength":47}
{"v":1, "sid":"a1b2c3", "seq":2, "event":"tool_call", "toolName":"search_slack", "toolInput":"{\"query\":\"rate limiting\"}"}
{"v":1, "sid":"a1b2c3", "seq":3, "event":"assistant_text", "textLength":510, "text":"Sarah discussed rate limiting requirements..."}
{"v":1, "sid":"a1b2c3", "seq":4, "event":"session_end", "outcome":"success", "costUsd":0.04}
```

Notice: `user_query` only has `textLength` (47 characters), not your actual message.

## Where It's Stored

All data is stored locally on your machine at:

```
~/.conduit/telemetry/sessions.jsonl
```

You can inspect this file at any time with **Conduit: View Collected Data** from the command palette.

## How to Control It

| Setting | What it does |
|---|---|
| `businessContext.telemetry.enabled` | Toggle local data logging on/off (re-enable after declining) |
| `businessContext.telemetry.syncEnabled` | Toggle uploading local data to Conduit's servers |

- **"No thanks" on consent prompt** — stops local logging (re-enable via the setting above)
- **Delete your data** — run **Conduit: Delete Collected Data** from the command palette
- **VS Code telemetry** — if you've set `telemetry.telemetryLevel` to "off", Conduit respects that and won't upload anything regardless of our setting

## Why We Collect This

The data helps us build better context search:

- **Relevance ranking** — learning which search results are actually useful
- **Query expansion** — understanding synonyms (e.g. "rate limiting" ↔ "API throttling")
- **Search strategies** — learning optimal tool call patterns

We never sell raw data. The trained models are the product — not your data.
