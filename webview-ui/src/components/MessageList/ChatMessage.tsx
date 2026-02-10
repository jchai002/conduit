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

const LABELS: Record<ChatMessageType["role"], string> = {
  user: "you",
  assistant: "conduit",
  error: "error",
  info: "info",
  log: "",
  agent: "agent",
};

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const label = LABELS[message.role];

  return (
    <div className={`message ${message.role}`}>
      {label && <div className="message-label">{label}</div>}
      <div className="message-content">{message.text}</div>
    </div>
  );
}
