/**
 * Test setup — runs before every test file in the webview-ui suite.
 *
 * Responsibilities:
 * 1. Import jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 * 2. Mock the VS Code webview API (acquireVsCodeApi) since tests run
 *    in jsdom, not inside a VS Code webview iframe
 */
import "@testing-library/jest-dom";

/** ResizeObserver doesn't exist in jsdom — mock it for components like CollapsibleView */
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

/** Mock postMessage function — tests can spy on this to verify sends */
export const mockPostMessage = vi.fn();

/**
 * VS Code webviews expose acquireVsCodeApi() as a global function.
 * We mock it to return a fake API with a spyable postMessage.
 */
(globalThis as any).acquireVsCodeApi = () => ({
  postMessage: mockPostMessage,
  getState: () => undefined,
  setState: () => undefined,
});
