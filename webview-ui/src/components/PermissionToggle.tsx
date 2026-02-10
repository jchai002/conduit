/**
 * Permission mode toggle button.
 *
 * Cycles through three modes on click:
 * - Ask (default): prompt before edits and scripts
 * - Auto-edit: auto-approve file edits, prompt before scripts
 * - YOLO: auto-approve everything (dangerous!)
 *
 * Reads current mode from context. Sends set-permission-mode to extension on change.
 */
import { useExtensionState } from "../context/ExtensionStateContext";
import { usePostMessage } from "../hooks/usePostMessage";
import type { PermissionModeValue } from "../types";

const MODES: { value: PermissionModeValue; label: string; icon: string; tooltip: string }[] = [
  { value: "default", label: "Ask", icon: "\u{1F6E1}", tooltip: "Ask before edits and scripts" },
  { value: "acceptEdits", label: "Auto-edit", icon: "\u{270F}", tooltip: "Auto-approve edits, ask before scripts" },
  { value: "bypassPermissions", label: "YOLO", icon: "\u{26A1}", tooltip: "YOLO: auto-approve everything" },
];

export function PermissionToggle() {
  const { state } = useExtensionState();
  const post = usePostMessage();

  const currentIdx = MODES.findIndex((m) => m.value === state.permissionMode);
  const current = MODES[currentIdx >= 0 ? currentIdx : 1];

  function cycle() {
    const nextIdx = (currentIdx + 1) % MODES.length;
    const next = MODES[nextIdx];
    post({ type: "set-permission-mode", mode: next.value });
  }

  return (
    <button
      className={`permission-toggle mode-${state.permissionMode}`}
      title={current.tooltip}
      onClick={cycle}
    >
      {current.icon} {current.label}
    </button>
  );
}
