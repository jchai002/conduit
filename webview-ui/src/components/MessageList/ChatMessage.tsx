/**
 * Renders a single chat message (user input, assistant response, errors, etc.)
 *
 * Each role gets a unique CSS class for border color and label styling:
 * - user: blue border, "you" label
 * - assistant: magenta border, "conduit" label
 * - error: red border, "error" label
 * - info: blue border, "info" label (dimmed)
 * - log: transparent border, no label (monospace, dimmed)
 * - agent: cyan border, "agent" label (monospace)
 */
import type { ChatMessage as ChatMessageType } from "../../context/types";
import { CollapsibleView } from "../CollapsibleView";

const LABELS: Record<ChatMessageType["role"], string> = {
  user: "you",
  assistant: "conduit",
  error: "error",
  info: "info",
  log: "",
  agent: "agent",
};

/** Roles whose message content can be long enough to warrant collapsing. */
const COLLAPSIBLE_ROLES = new Set<string>(["user", "assistant"]);

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const label = LABELS[message.role];
  const content = <div className="message-content">{message.text}</div>;

  return (
    <div className={`message ${message.role}`}>
      {label && <div className="message-label">{label}</div>}
      {COLLAPSIBLE_ROLES.has(message.role) ? (
        <CollapsibleView>{content}</CollapsibleView>
      ) : (
        content
      )}
    </div>
  );
}
