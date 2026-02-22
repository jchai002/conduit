/**
 * Cloudflare Worker — production OAuth proxy and telemetry relay for Conduit.
 *
 * Handles the full Slack OAuth flow server-side so the client secret
 * never leaves the server. The flow:
 *
 *   1. User clicks "Connect Slack" → browser opens Slack's authorize URL
 *   2. Slack redirects to: https://<worker>/slack-callback?code=xyz&state=abc
 *   3. Worker exchanges the code for a token using the client secret
 *   4. Worker stores the token in KV (keyed by state, 5-min TTL)
 *   5. Worker redirects browser to: vscode://jerrychaitea.conduit/slack-callback?state=abc
 *   6. VS Code extension calls: https://<worker>/exchange?state=abc
 *   7. Worker returns the token from KV and deletes it
 *
 * Rate limiting:
 *   - OAuth endpoints: 20 requests/day per IP address
 *   - Telemetry upload: 10 requests/day per device ID
 *   Uses KV with 24-hour TTL for counters (auto-cleanup).
 *
 * Secrets (set via `wrangler secret put`):
 *   - SLACK_CLIENT_ID
 *   - SLACK_CLIENT_SECRET
 *
 * KV namespace binding: OAUTH_KV
 * R2 bucket binding: TELEMETRY_BUCKET
 *
 * Deployment:
 *   wrangler deploy
 */

/** Max upload size (1MB). Telemetry JSONL chunks should be well under this. */
const MAX_UPLOAD_BYTES = 1_048_576;

/** Daily rate limits per identifier. */
const OAUTH_RATE_LIMIT = 20;   // per IP
const UPLOAD_RATE_LIMIT = 10;  // per device ID

/**
 * Checks and increments a rate-limit counter in KV.
 * Returns true if the request is allowed, false if limit exceeded.
 * Keys auto-expire after 24 hours so no cleanup is needed.
 */
async function checkRateLimit(kv, prefix, identifier, limit) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `ratelimit:${prefix}:${identifier}:${today}`;
  const count = parseInt(await kv.get(key) || "0");
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Slack OAuth callback ──────────────────────────────────
    // Slack redirects here after user authorizes. We exchange the
    // code for a token server-side, stash it in KV, then redirect
    // the browser to VS Code's URI handler (with state only).
    if (url.pathname === "/slack-callback") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (!await checkRateLimit(env.OAUTH_KV, "oauth", ip, OAUTH_RATE_LIMIT)) {
        return new Response("Rate limit exceeded. Try again tomorrow.", { status: 429 });
      }
      return handleSlackCallback(url, env);
    }

    // ── Token exchange endpoint ───────────────────────────────
    // VS Code extension calls this to retrieve the token that was
    // stashed during the OAuth callback. One-time use: the KV
    // entry is deleted after retrieval.
    if (url.pathname === "/exchange") {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (!await checkRateLimit(env.OAUTH_KV, "oauth", ip, OAUTH_RATE_LIMIT)) {
        return new Response("Rate limit exceeded. Try again tomorrow.", { status: 429 });
      }
      return handleExchange(url, env);
    }

    // ── Telemetry upload ────────────────────────────────────
    // Extension POSTs JSONL telemetry data directly. The Worker
    // writes it to R2 — no pre-signed URL round trip needed.
    if (url.pathname === "/telemetry/upload" && request.method === "POST") {
      return handleTelemetryUpload(request, env);
    }

    // Health check
    if (url.pathname === "/") {
      return new Response("Conduit OAuth proxy is running.", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleSlackCallback(url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<h2>Slack authorization failed</h2><p>Error: ${error}</p>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code || !state) {
    return new Response("<h2>Missing authorization code or state</h2>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Exchange the authorization code for tokens using the client secret.
  // The redirect_uri must match what was used in the authorization URL.
  const redirectUri = `${url.origin}/slack-callback`;
  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.ok) {
    return new Response(
      `<h2>Token exchange failed</h2><p>${tokenData.error || "Unknown error"}</p>`,
      { status: 502, headers: { "Content-Type": "text/html" } }
    );
  }

  // Extract the user token (xoxp-) for search.messages.
  // The user token is in authed_user.access_token, NOT data.access_token
  // (which is the bot token). search.messages only works with user tokens.
  const userToken = tokenData.authed_user?.access_token;
  if (!userToken) {
    return new Response(
      "<h2>No user token returned</h2><p>Ensure search:read is in user_scope.</p>",
      { status: 502, headers: { "Content-Type": "text/html" } }
    );
  }

  // Store token in KV, keyed by the state nonce. The extension will
  // retrieve it via /exchange?state=... within 5 minutes.
  const tokenPayload = JSON.stringify({
    userToken,
    teamName: tokenData.team?.name || "",
  });
  await env.OAUTH_KV.put(state, tokenPayload, { expirationTtl: 300 });

  // Redirect browser to VS Code's URI handler. Only pass the state —
  // the token stays server-side until the extension fetches it.
  const vscodeUri = `vscode://jerrychaitea.conduit/slack-callback?state=${encodeURIComponent(state)}`;

  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${vscodeUri}">
  <title>Redirecting to VS Code...</title>
</head>
<body>
  <h2>Redirecting to VS Code...</h2>
  <p>If VS Code doesn't open automatically, <a href="${vscodeUri}">click here</a>.</p>
  <script>window.location.href = ${JSON.stringify(vscodeUri)};</script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

async function handleExchange(url, env) {
  const state = url.searchParams.get("state");

  if (!state) {
    return Response.json({ ok: false, error: "missing_state" }, { status: 400 });
  }

  // Retrieve the token payload stashed during the OAuth callback
  const tokenPayload = await env.OAUTH_KV.get(state);

  if (!tokenPayload) {
    return Response.json(
      { ok: false, error: "token_not_found_or_expired" },
      { status: 404 }
    );
  }

  // Delete from KV — one-time use
  await env.OAUTH_KV.delete(state);

  const { userToken, teamName } = JSON.parse(tokenPayload);
  return Response.json({ ok: true, userToken, teamName });
}

// ── Telemetry Upload ──────────────────────────────────────

/**
 * Accepts JSONL telemetry data and writes it to R2.
 *
 * Request:
 *   POST /telemetry/upload
 *   Header: X-Device-ID: <uuid>
 *   Body: raw JSONL text
 *
 * R2 key format: {deviceId}/{date}/{timestamp}.jsonl
 * Each upload is a separate object — R2 doesn't support append,
 * so we use unique timestamps. Aggregation happens at read time.
 */
async function handleTelemetryUpload(request, env) {
  const deviceId = request.headers.get("X-Device-ID");
  if (!deviceId || deviceId.length > 64) {
    return Response.json({ ok: false, error: "missing_or_invalid_device_id" }, { status: 400 });
  }

  // Rate limit: 10 uploads per device per day
  if (!await checkRateLimit(env.OAUTH_KV, "upload", deviceId, UPLOAD_RATE_LIMIT)) {
    return Response.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
  }

  // Read and validate body size
  const body = await request.text();
  if (!body.trim()) {
    return Response.json({ ok: false, error: "empty_body" }, { status: 400 });
  }
  if (body.length > MAX_UPLOAD_BYTES) {
    return Response.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  // Write to R2 — unique key per upload to avoid overwrites.
  // Format: {deviceId}/{date}/{timestamp}.jsonl
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const timestamp = now.getTime();
  const key = `${deviceId}/${date}/${timestamp}.jsonl`;

  await env.TELEMETRY_BUCKET.put(key, body, {
    httpMetadata: { contentType: "application/x-ndjson" },
  });

  return Response.json({ ok: true, key });
}
