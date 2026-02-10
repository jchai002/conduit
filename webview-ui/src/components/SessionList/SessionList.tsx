/**
 * Session list panel — shows past conversations.
 *
 * Reads sessions from context. Visible when showSessionList is true.
 * Each session row shows title, relative time, message count.
 * Clicking a session sends "open-session" to the extension.
 * Delete button (x) sends "delete-session".
 */
import { useExtensionState } from "../../context/ExtensionStateContext";
import { usePostMessage } from "../../hooks/usePostMessage";
import { SessionItem } from "./SessionItem";

export function SessionList() {
  const { state } = useExtensionState();
  const post = usePostMessage();

  if (!state.showSessionList) return null;

  function handleOpen(sessionId: string) {
    post({ type: "open-session", sessionId });
  }

  function handleDelete(sessionId: string) {
    post({ type: "delete-session", sessionId });
  }

  function handleNew() {
    post({ type: "new-conversation" });
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <span className="session-list-title">Conversations</span>
        <button className="session-list-new-btn" onClick={handleNew}>
          + New
        </button>
      </div>
      <div className="session-list-items">
        {state.sessions.length === 0 ? (
          <div className="session-list-empty">No past conversations</div>
        ) : (
          state.sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
