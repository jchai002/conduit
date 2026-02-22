/**
 * Build script — two-pipeline architecture:
 * 1. Extension host: esbuild bundles src/extension.ts → dist/extension.js (CJS, Node.js)
 * 2. Webview: Vite bundles webview-ui/src/main.tsx → dist/webview.js + dist/webview.css (IIFE, browser)
 *
 * The webview uses React + Vite (separate package in webview-ui/).
 * Vite handles JSX, CSS, and produces a single IIFE bundle for the VS Code webview.
 */
import * as esbuild from "esbuild";
import { execSync } from "child_process";
import { mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

// Extension host build (Node.js, CJS, excludes vscode)
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.cjs",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
};

// Ensure dist/ exists before either build writes to it
mkdirSync("dist", { recursive: true });

/** Build the React webview via Vite (outputs to dist/webview.js + dist/webview.css) */
function buildWebview() {
  execSync("npx vite build", { cwd: "webview-ui", stdio: "inherit" });
}

if (isWatch) {
  const ctx = await esbuild.context(extensionConfig);
  await ctx.watch();
  buildWebview();
  console.log("Watching for extension changes... (run 'cd webview-ui && npm run dev' for webview watch)");
} else {
  await esbuild.build(extensionConfig);
  buildWebview();
}
