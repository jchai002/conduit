/**
 * Header with title, session selector dropdown, and new conversation button.
 *
 * The session button shows the current conversation title (truncated) with
 * a chevron. Clicking it opens a floating dropdown menu listing past sessions.
 * The "+" button starts a fresh conversation.
 *
 * When no conversation is active, the button shows "No conversation" as
 * placeholder text.
 */
import { useState, useRef, useEffect } from "react";
import { useExtensionState } from "../context/ExtensionStateContext";
import { usePostMessage } from "../hooks/usePostMessage";
import { SessionItem } from "./SessionList/SessionItem";

export function Header() {
  const { state, postToExtension } = useExtensionState();
  const post = usePostMessage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  function handleToggleDropdown() {
    if (!dropdownOpen) {
      // Load fresh session list when opening
      postToExtension({ type: "load-session-list" });
    }
    setDropdownOpen((prev) => !prev);
  }

  function handleOpenSession(sessionId: string) {
    post({ type: "open-session", sessionId });
    setDropdownOpen(false);
  }

  function handleDeleteSession(sessionId: string) {
    post({ type: "delete-session", sessionId });
  }

  function handleNewConversation() {
    post({ type: "new-conversation" });
    setDropdownOpen(false);
  }

  const title = state.currentSessionTitle || "No conversation";

  return (
    <div id="header">
      <h1>Conduit</h1>
      <span className="subtitle">Business context for AI coding</span>
      <div className="header-actions">
        <div className="session-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="header-btn session-selector-btn"
            title={state.currentSessionTitle || "Browse past conversations"}
            onClick={handleToggleDropdown}
          >
            <span className="session-selector-title">{title}</span>
            <span className={`session-selector-chevron ${dropdownOpen ? "open" : ""}`}>▾</span>
          </button>
          {dropdownOpen && (
            <div className="session-dropdown">
              {state.sessions.length === 0 ? (
                <div className="session-dropdown-empty">No past conversations</div>
              ) : (
                state.sessions.map((session) => (
                  <SessionItem
                    key={session.sessionId}
                    session={session}
                    onOpen={handleOpenSession}
                    onDelete={handleDeleteSession}
                  />
                ))
              )}
            </div>
          )}
        </div>
        <button
          className="header-btn header-btn-new"
          title="Start new conversation"
          onClick={handleNewConversation}
        >
          +
        </button>
      </div>
    </div>
  );
}
