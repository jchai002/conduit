/**
 * Provider connection panel — shows connection status for business context providers (Slack, Teams, etc.)
 * and allows users to connect/disconnect.
 *
 * Displays a "Data Sources" section with provider cards showing:
 * - Provider icon and name
 * - Connection status (connected/not connected)
 * - Workspace name (if connected)
 * - Connect/Disconnect button
 *
 * Communication flow:
 * - "Connect" sends { type: "connect-slack" } to extension → opens browser OAuth
 * - "Disconnect" sends { type: "disconnect-slack" } to extension → clears token
 * - Extension sends back { type: "slack-status" } with updated connection state
 */
import { useExtensionState } from "../context/ExtensionStateContext";
import { usePostMessage } from "../hooks/usePostMessage";

export function ProviderConnection() {
  const { state } = useExtensionState();
  const post = usePostMessage();

  const slackStatus = state.slackStatus;

  // Still checking
  if (!slackStatus) return null;

  return (
    <div className="provider-connection">
      <div className="provider-connection-header">Data Sources</div>

      <div className="provider-card">
        <div className="provider-icon">
          <svg className="provider-icon-svg" viewBox="0 0 24 24" fill="currentColor">
            {/* Slack logo - simplified hashtag icon */}
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>

        <div className="provider-info">
          <div className="provider-name">Slack</div>
          {slackStatus.connected ? (
            <div className="provider-status-connected">
              Connected to {slackStatus.workspaceName || "workspace"}
            </div>
          ) : (
            <div className="provider-status-disconnected">Not connected</div>
          )}
        </div>

        <div className="provider-actions">
          {slackStatus.connected ? (
            <button
              className="provider-btn provider-btn-secondary"
              onClick={() => post({ type: "disconnect-slack" })}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="provider-btn provider-btn-primary"
              onClick={() => post({ type: "connect-slack" })}
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
