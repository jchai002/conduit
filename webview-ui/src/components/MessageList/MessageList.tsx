/**
 * Maps the messages[] array from state to the appropriate React component
 * for each message type. Uses the discriminated union's `kind` field to
 * select the right renderer.
 *
 * Auto-scrolling is handled by the parent (App.tsx) on the #messages div,
 * since that's the element with overflow-y: auto.
 */
import { useExtensionState } from "../../context/ExtensionStateContext";
import type { MessageItem } from "../../context/types";
import { ChatMessage } from "./ChatMessage";
import { ToolCallMessage } from "./ToolCallMessage";
import { PermissionRequest } from "./PermissionRequest";
import { TodoList } from "./TodoList";
import { UserQuestion } from "./UserQuestion";
import { PlanReview } from "./PlanReview";
import { CompactSummary } from "./CompactSummary";

export function MessageList() {
  const { state } = useExtensionState();

  // Find each turn's final assistant response — these are the synthesized
  // answers and should always be fully visible (not collapsed).
  const lastResponseIds = findLastResponseIds(state.messages);

  return (
    <>
      {state.messages.map((item) => {
        switch (item.kind) {
          case "chat-message":
            return (
              <ChatMessage
                key={item.id}
                message={item}
                canCollapse={!lastResponseIds.has(item.id)}
              />
            );
          case "tool-call":
            return <ToolCallMessage key={item.id} tool={item} />;
          case "permission-request":
            return <PermissionRequest key={item.id} item={item} />;
          case "todo-list":
            return <TodoList key={item.id} item={item} />;
          case "user-question":
            return <UserQuestion key={item.id} item={item} />;
          case "plan-review":
            return <PlanReview key={item.id} item={item} />;
          case "compact-summary":
            return <CompactSummary key={item.id} item={item} />;
        }
      })}
    </>
  );
}

/** Finds the last assistant chat-message before each user message (and at
 *  the end of the array). These are the final synthesized responses for each
 *  turn and should always be fully visible — not collapsed. */
function findLastResponseIds(messages: MessageItem[]): Set<string> {
  const ids = new Set<string>();
  let lastAssistantId: string | null = null;

  for (const m of messages) {
    if (m.kind !== "chat-message") continue;
    if (m.role === "assistant") {
      lastAssistantId = m.id;
    } else if (m.role === "user" && lastAssistantId) {
      ids.add(lastAssistantId);
      lastAssistantId = null;
    }
  }
  // Trailing assistant response (no following user message yet)
  if (lastAssistantId) ids.add(lastAssistantId);

  return ids;
}
