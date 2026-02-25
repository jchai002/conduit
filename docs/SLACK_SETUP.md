# Slack Setup Guide

Tether supports two ways to connect Slack:

- **OAuth (recommended)** — Click "Connect Slack" in the UI, authorize in browser, done.
- **Manual token** — Create a user token manually and paste it into settings.

## How OAuth Works

The client secret never touches the extension. The flow:

1. User clicks "Connect Slack" → browser opens Slack's authorize page
2. User clicks "Allow" → Slack redirects to the Cloudflare Worker with an auth code
3. Worker exchanges the code for a token server-side (using the client secret stored as a Worker secret)
4. Worker stashes the token in KV (5-min TTL), redirects browser to `vscode://` URI
5. VS Code catches the URI, extension fetches the token from the Worker's `/exchange` endpoint
6. Token stored locally in VS Code's encrypted SecretStorage — done

## Developer Setup (One-Time)

These steps are for the extension developer (you). End users only click "Connect Slack".

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. **App Name:** "Tether" (or any name)
4. **Workspace:** Select your test workspace
5. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In the left sidebar, click **"OAuth & Permissions"**
2. Under **"Redirect URLs"**, add your Worker URL:
   - Development (ngrok): `https://<ngrok-url>/slack-callback`
   - Production: `https://tether-oauth.<account>.workers.dev/slack-callback`
3. Under **"User Token Scopes"**, add:
   - `search:read` — Search messages (requires user token)
4. Under **"Bot Token Scopes"**, add:
   - `channels:history`, `channels:read`
   - `groups:history`, `groups:read`
   - `im:history`, `im:read`
   - `mpim:history`, `mpim:read`
   - `users:read`

### Step 3: Deploy the Cloudflare Worker

1. Install wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
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
7. Your URL will be: `https://tether-oauth.<account>.workers.dev`

### Step 4: Configure VS Code Settings

Add your Slack app's client ID and Worker URL to `.vscode/settings.json`:

```json
{
  "businessContext.slack.clientId": "YOUR_CLIENT_ID",
  "businessContext.slack.oauthProxyUrl": "https://tether-oauth.<account>.workers.dev"
}
```

No client secret needed in VS Code — it stays on the Worker.

## Development: ngrok (Alternative)

For local development you can use ngrok + the local proxy server instead of the Worker:

1. Start the local proxy server:
   ```bash
   node oauth-proxy/local-server.js
   ```

2. In another terminal, start ngrok:
   ```bash
   ngrok http 3456
   ```

3. Copy the HTTPS URL from ngrok (e.g. `https://abc123.ngrok-free.app`)

4. Add the redirect URL in your Slack app settings:
   `https://abc123.ngrok-free.app/slack-callback`

5. Set the proxy URL in VS Code settings:
   ```json
   {
     "businessContext.slack.oauthProxyUrl": "https://abc123.ngrok-free.app"
   }
   ```

6. Press F5 to launch Extension Dev Host, click "Connect Slack" — done!

> **Note:** The local server is a redirect-only proxy (code goes to the extension).
> The Cloudflare Worker handles token exchange server-side. For production/distribution,
> always use the Worker.

## Distributing the Slack App (Unlisted)

To let users outside your workspace connect via OAuth:

1. In your Slack app settings, go to **"Manage Distribution"**
2. Complete the checklist items (redirect URL, scopes, etc.)
3. Click **"Activate Public Distribution"**
4. Copy the **shareable install URL** — this is what Tether uses as the OAuth authorize URL
5. Users install by clicking "Connect Slack" in Tether → they see the standard Slack authorize screen

Unlisted distribution (no Slack App Directory listing) requires no review. Users can install
immediately via the direct URL. The app won't appear in Slack's marketplace search.

## Manual Token Setup (Alternative)

If you prefer not to use OAuth, you can create a user token manually:

1. Follow Steps 1-2 above to create a Slack app with scopes
2. Click **"Install to Workspace"** → **"Allow"**
3. Copy the **User OAuth Token** (starts with `xoxp-`)
4. In VS Code settings, set `businessContext.slack.userToken` to the token

> **Important:** You need a **User** token (`xoxp-`), not a Bot token (`xoxb-`).
> The `search.messages` API only works with user tokens.

## End User Experience (OAuth)

1. User installs Tether extension
2. User opens Tether chat panel
3. User clicks **"Connect"** next to Slack
4. Browser opens Slack authorization page
5. User clicks **"Allow"**
6. Browser redirects → Worker exchanges code → VS Code opens → Slack connected!

## Troubleshooting

### OAuth redirect fails

- Make sure the Worker is deployed (or ngrok is running for dev)
- Verify the redirect URL in Slack app matches your Worker URL exactly
- Check that `businessContext.slack.oauthProxyUrl` is set correctly

### "token_not_found_or_expired" error

- The token exchange must happen within 5 minutes of authorization
- Try the OAuth flow again — click "Connect Slack"

### "Not authenticated" Error

- Make sure you have a **User OAuth Token** (starts with `xoxp-`)
- Not the Bot token or other tokens

### "No results found"

- Check that your bot has been added to channels you want to search
- In Slack, type `/invite @YourBotName` in any channel

## Security

- **Client secret** is stored as a Cloudflare Worker secret — never in the extension or user settings
- **User tokens** are stored in VS Code's encrypted SecretStorage (per-user, per-machine)
- **Auth codes** are one-time use and expire in 10 minutes
- **KV tokens** auto-expire after 5 minutes and are deleted on first retrieval
- The Worker never logs or persists tokens beyond the 5-minute KV window
