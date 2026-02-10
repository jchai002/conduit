/**
 * Webview entry point — bootstraps React inside the VS Code webview iframe.
 *
 * acquireVsCodeApi() must be called exactly once, before React renders.
 * The returned handle is passed into the Context provider so any component
 * can send messages to the extension host via usePostMessage().
 */
import { createRoot } from "react-dom/client";
import { App } from "./App";

import "./styles/global.css";

// Acquire VS Code API handle (must be called once, at module scope)
const vscodeApi = acquireVsCodeApi();

const root = createRoot(document.getElementById("root")!);
root.render(<App vscodeApi={vscodeApi} />);
