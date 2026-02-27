# Self-Hosted Slack App Setup

By default, Tether ships with a pre-configured Slack app so users can connect with a single click — no Slack app creation, no Worker deployment, no configuration. If your organization doesn't allow unlisted third-party Slack apps, you can create your own Slack app and point Tether at it using the steps below.

This guide walks through creating a Slack app, deploying the OAuth proxy, and configuring Tether to use them.

## Overview

Tether's OAuth flow has two components you'll self-host:

1. **Slack app** — registered in your workspace, defines scopes and redirect URLs
2. **Cloudflare Worker** — handles the token exchange server-side so the client secret never touches the extension

Once set up, your team members connect Slack the same way (click "Connect Slack"), but the OAuth flow goes through your app and your Worker.

## Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. **App Name:** "Tether" (or any name your org prefers)
4. **Workspace:** Select your workspace
5. Click **"Create App"**

## Step 2: Configure OAuth & Permissions

1. In the left sidebar, click **"OAuth & Permissions"**
2. Under **"Redirect URLs"**, add your Worker URL:
   ```
   https://tether-oauth.<your-account>.workers.dev/slack-callback
   ```
3. Under **"User Token Scopes"**, add all of these:
   - `search:read` — search messages (core feature)
   - `channels:read` — list channels for resolution
   - `channels:history` — fetch thread replies
   - `groups:read` — private channel listing
   - `groups:history` — private channel threads
   - `im:read` — DM listing
   - `im:history` — DM threads
   - `mpim:read` — group DM listing
   - `mpim:history` — group DM threads
   - `users:read` — user name resolution
4. Under **"Bot Token Scopes"**, add:
   - `channels:read` — Slack requires at least one bot scope for app installation. Tether doesn't use the bot token.

> **Why user scopes?** Slack's `search.messages` API only works with user tokens (`xoxp-`). Tether searches on behalf of the authenticated user, so all meaningful scopes are user-level.

## Step 3: Deploy the Cloudflare Worker

The Worker handles the OAuth token exchange so the client secret stays server-side. The source is in `oauth-proxy/cloudflare-worker.js`.

1. Install wrangler:
   ```bash
   npm install -g wrangler
   ```
2. Login:
   ```bash
   wrangler login
   ```
3. Create a KV namespace:
   ```bash
   wrangler kv namespace create OAUTH_KV
   ```
4. Copy the namespace ID into `oauth-proxy/wrangler.toml`
5. Set secrets:
   ```bash
   wrangler secret put SLACK_CLIENT_ID
   # Paste your Slack app's Client ID
   wrangler secret put SLACK_CLIENT_SECRET
   # Paste your Slack app's Client Secret
   ```
6. Deploy:
   ```bash
   cd oauth-proxy && wrangler deploy
   ```
7. Your URL will be: `https://tether-oauth.<your-account>.workers.dev`

## Step 4: Configure Tether

Set these two VS Code settings (workspace or user level):

```json
{
  "businessContext.slack.clientId": "YOUR_SLACK_APP_CLIENT_ID",
  "businessContext.slack.oauthProxyUrl": "https://tether-oauth.<your-account>.workers.dev"
}
```

Both must be set together. If either is empty, Tether falls back to the built-in default app.

No client secret needed in VS Code — it stays on the Worker.

## Step 5: Distribute to Your Team

**Single workspace (simplest):** Install the Slack app to your workspace and share the VS Code settings above with your team.

**Multiple workspaces:** Enable distribution in your Slack app settings:

1. Go to **"Manage Distribution"**
2. Complete the checklist items
3. Click **"Activate Public Distribution"**

Users outside your workspace can then authorize via the standard Slack consent screen when they click "Connect Slack" in Tether.

## Alternative: Manual Token (No Worker Needed)

If you don't want to deploy the Worker, users can create tokens manually:

1. Follow Steps 1-2 above to create a Slack app with scopes
2. Click **"Install to Workspace"** → **"Allow"**
3. Copy the **User OAuth Token** (starts with `xoxp-`)
4. In VS Code settings, set `businessContext.slack.userToken` to the token

> **Important:** You need a **User** token (`xoxp-`), not a Bot token (`xoxb-`). The `search.messages` API only works with user tokens.

## Troubleshooting

### OAuth redirect fails
- Make sure the Worker is deployed
- Verify the redirect URL in your Slack app matches your Worker URL exactly (including `/slack-callback`)
- Check that `businessContext.slack.oauthProxyUrl` is set correctly in VS Code

### "token_not_found_or_expired" error
- The token exchange must happen within 5 minutes of authorization
- Try the OAuth flow again — click "Connect Slack"

### "Not authenticated" error
- Make sure you have a **User OAuth Token** (starts with `xoxp-`)
- Not the Bot token or other tokens

### "No results found"
- The `search:read` scope only searches channels the authenticated user has access to
- Private channels require the user to be a member

## Security

- **Client secret** is stored as a Cloudflare Worker secret — never in the extension or user settings
- **User tokens** are stored in VS Code's encrypted SecretStorage (per-user, per-machine)
- **Auth codes** are one-time use and expire in 10 minutes
- **KV tokens** auto-expire after 5 minutes and are deleted on first retrieval
- The Worker never logs or persists tokens beyond the 5-minute KV window
