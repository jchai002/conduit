/**
 * Renders a permission request from Claude — shows the tool name,
 * optional reason, the input being requested, and Allow/Deny buttons.
 *
 * When the user clicks Allow or Deny, the component:
 * 1. Dispatches ui/resolve-permission to mark it resolved in state
 * 2. Sends a permission-response message to the extension
 *
 * After resolving, buttons are replaced with a status label and
 * the whole block dims (via .permission-resolved CSS class).
 */
import type { PermissionRequestItem } from "../../context/types";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { usePostMessage } from "../../hooks/usePostMessage";

interface PermissionRequestProps {
  item: PermissionRequestItem;
}

export function PermissionRequest({ item }: PermissionRequestProps) {
  const { dispatch } = useExtensionState();
  const post = usePostMessage();

  function handleResponse(behavior: "allow" | "deny") {
    dispatch({ type: "ui/resolve-permission", requestId: item.requestId, behavior });
    post({ type: "permission-response", requestId: item.requestId, behavior });
  }

  return (
    <div
      className={`message permission-request${item.resolved ? " permission-resolved" : ""}`}
      data-request-id={item.requestId}
    >
      <div className="message-label">{item.toolName}</div>
      {item.reason && <div className="permission-reason">{item.reason}</div>}
      <div className="message-content tool-input">{item.input}</div>
      {item.resolved ? (
        <div className={`permission-status permission-${item.resolved}`}>
          {item.resolved === "allow" ? "allowed" : "denied"}
        </div>
      ) : (
        <div className="permission-buttons">
          <button
            className="permission-btn permission-btn-allow"
            onClick={() => handleResponse("allow")}
          >
            allow
          </button>
          <button
            className="permission-btn permission-btn-deny"
            onClick={() => handleResponse("deny")}
          >
            deny
          </button>
        </div>
      )}
    </div>
  );
}
