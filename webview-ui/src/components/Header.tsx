/**
 * Header with title and action buttons (History, + New).
 *
 * History toggles the session list panel.
 * New starts a fresh conversation (clears current one).
 */
import { useExtensionState } from "../context/ExtensionStateContext";
import { usePostMessage } from "../hooks/usePostMessage";

export function Header() {
  const { dispatch, postToExtension } = useExtensionState();
  const post = usePostMessage();

  function handleToggleHistory() {
    postToExtension({ type: "load-session-list" });
    dispatch({ type: "ui/toggle-session-list" });
  }

  function handleNewConversation() {
    post({ type: "new-conversation" });
  }

  return (
    <div id="header">
      <h1>Conduit</h1>
      <span className="subtitle">Business context for AI coding</span>
      <div className="header-actions">
        <button
          className="header-btn"
          title="Browse past conversations"
          onClick={handleToggleHistory}
        >
          History
        </button>
        <button
          className="header-btn header-btn-new"
          title="Start new conversation"
          onClick={handleNewConversation}
        >
          + New
        </button>
      </div>
    </div>
  );
}
