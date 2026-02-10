/**
 * Hook that returns a typed function for sending messages to the extension host.
 *
 * Usage:
 *   const post = usePostMessage();
 *   post({ type: "query", text: "search for rate limiting" });
 *
 * This is a convenience wrapper — internally it just calls
 * vscodeApi.postMessage() from the Context.
 */
import { useCallback } from "react";
import { useExtensionState } from "../context/ExtensionStateContext";
import type { WebviewToExtensionMessage } from "../types";

export function usePostMessage() {
  const { postToExtension } = useExtensionState();

  return useCallback(
    (msg: WebviewToExtensionMessage) => postToExtension(msg),
    [postToExtension]
  );
}
