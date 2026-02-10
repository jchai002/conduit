/**
 * Type declarations for VS Code's webview API.
 *
 * acquireVsCodeApi() is injected by VS Code into the webview iframe.
 * It can only be called once — subsequent calls throw. We call it in main.tsx
 * and pass the handle down via React Context.
 */
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
