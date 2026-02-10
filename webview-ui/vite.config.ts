/**
 * Vite config for the React webview.
 *
 * Key constraints for VS Code webviews:
 * - Output must be IIFE (sandboxed iframe, no module loader)
 * - Single JS file + single CSS file (loaded via <script> and <link> tags)
 * - emptyOutDir: false — the extension build writes dist/extension.js first
 * - @shared alias lets us import the message protocol types without duplication
 * - tailwindcss() must come before react() so Tailwind processes CSS first
 * - @ alias maps to src/ for Shadcn component imports
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../src/chat"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src/main.tsx"),
      output: {
        entryFileNames: "webview.js",
        assetFileNames: "webview.[ext]",
        format: "iife",
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true,
  },
});
