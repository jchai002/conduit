import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: ["webview-ui/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      vscode: "__mocks__/vscode.ts",
    },
  },
});
