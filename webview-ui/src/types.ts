/**
 * Re-exports shared types from the extension's message protocol.
 *
 * The @shared alias resolves to ../src/chat/ via Vite's resolve.alias config.
 * This lets the React webview import the same types the extension uses,
 * keeping the message protocol in sync without any duplication.
 */
export type {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  PermissionModeValue,
} from "@shared/messages";

export type { SessionMeta, StoredMessage } from "@shared/sessionStore";
