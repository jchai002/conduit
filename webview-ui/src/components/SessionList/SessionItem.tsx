/**
 * A single session row in the session list.
 * Shows the session title, relative time, message count, and a delete button.
 */
import type { SessionMeta } from "../../types";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

interface SessionItemProps {
  session: SessionMeta;
  onOpen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionItem({ session, onOpen, onDelete }: SessionItemProps) {
  return (
    <div className="session-item">
      <div
        className="session-item-info"
        onClick={() => onOpen(session.sessionId)}
      >
        <div className="session-item-title">{session.title}</div>
        <div className="session-item-meta">
          {formatRelativeTime(session.updatedAt)} &middot; {session.messageCount} msgs
        </div>
      </div>
      <button
        className="session-item-delete"
        title="Delete conversation"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.sessionId);
        }}
      >
        &times;
      </button>
    </div>
  );
}
