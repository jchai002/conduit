/**
 * Input area — textarea, permission toggle, and send/stop button.
 *
 * Layout (inspired by Claude Code):
 * ┌────────────────────────────────────┐
 * │ [textarea]                         │
 * │─────────── subtle divider ─────────│
 * │ [permission toggle]    [send/stop] │
 * └────────────────────────────────────┘
 *
 * Behavior:
 * - Enter sends the message (Shift+Enter for newline)
 * - Textarea auto-resizes up to 120px as user types
 * - Send = arrow-up icon, Stop = square icon (like Claude Code)
 * - Permission toggle on the left, send/stop right-aligned
 * - Left side is reserved for future buttons (attach, etc.)
 *
 * Sends "query" for first message, "followup" for subsequent messages.
 */
import { useRef, useState, useCallback } from "react";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { usePostMessage } from "../../hooks/usePostMessage";
import { PermissionToggle } from "../PermissionToggle";
import { ContextUsage } from "../ContextUsage";

export function InputArea() {
  const { state, dispatch } = useExtensionState();
  const post = usePostMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || state.busy) return;

    // Add user message to the message list and mark as busy
    dispatch({ type: "ui/add-user-message", text: trimmed });

    // Send to extension: "query" for first message, "followup" for subsequent
    const msgType = state.inConversation ? "followup" : "query";
    post({ type: msgType, text: trimmed } as any);

    // Reset textarea
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, state.busy, state.inConversation, dispatch, post]);

  /** Sends cancel message to extension — the agent stops and the
   *  conversation is preserved so the user can resume with a follow-up. */
  const stop = useCallback(() => {
    post({ type: "cancel" } as any);
  }, [post]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div id="input-area">
      <textarea
        ref={textareaRef}
        id="input"
        rows={1}
        placeholder={
          state.inConversation
            ? "Follow up or ask a question..."
            : "Describe what you need..."
        }
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {/* Toolbar: permission toggle left, send/stop right */}
      <div className="input-toolbar">
        <div className="input-toolbar-left">
          <PermissionToggle />
          <ContextUsage />
        </div>
        <div className="input-toolbar-right">
          {state.busy ? (
            <button className="input-action-btn stop-btn" onClick={stop} title="Stop">
              {/* Square icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="2" width="10" height="10" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button className="input-action-btn send-btn" onClick={send} title="Send">
              {/* Arrow-up icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="12" x2="7" y2="3" />
                <polyline points="3,6 7,2 11,6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
