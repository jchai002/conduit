/**
 * Thin wrapper that converts a PermissionRequestItem into generic
 * UserResponsePanel props.
 *
 * Shows the tool name as the label, the tool input as content, and
 * Allow/Deny as clickable option cards. Handles dispatching the
 * response to state and posting it to the extension.
 */
import type { PermissionRequestItem } from "../../context/types";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { usePostMessage } from "../../hooks/usePostMessage";
import { UserResponsePanel } from "./tools/UserResponsePanel";

interface PermissionRequestProps {
  item: PermissionRequestItem;
}

export function PermissionRequest({ item }: PermissionRequestProps) {
  const { dispatch } = useExtensionState();
  const post = usePostMessage();

  return (
    <UserResponsePanel
      className="permission-request"
      label={item.toolName}
      questions={[{
        header: "Action",
        text: item.reason || "Allow this tool call?",
        options: [
          { label: "Allow", description: "Permit this tool call to execute" },
          { label: "Deny", description: "Block this tool call" },
        ],
      }]}
      resolvedAnswers={
        item.resolved
          ? { Action: item.resolved === "allow" ? "Allowed" : "Denied" }
          : undefined
      }
      onSubmit={(answers) => {
        const behavior = answers.Action === "Allow" ? "allow" as const : "deny" as const;
        dispatch({ type: "ui/resolve-permission", requestId: item.requestId, behavior });
        post({ type: "permission-response", requestId: item.requestId, behavior });
      }}
    >
      <div className="message-content tool-input">{item.input}</div>
    </UserResponsePanel>
  );
}
