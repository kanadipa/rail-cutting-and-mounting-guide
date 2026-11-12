import path from "node:path";
import react from "@vitejs/plugin-react";
import sirv from "sirv";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const projectRoot = path.resolve(import.meta.dirname, "..");
const apiPort = process.env.API_PORT ?? "3000";

/**
 * Serves the 3D models and product pictures from the project's assets/ folder. They are named by
 * article and never change, so the browser may keep them for good.
 */
const staticAssets = (): Plugin => ({
  name: "rail-guide-static-assets",
  configureServer(server) {
    server.middlewares.use("/assets", sirv(path.join(projectRoot, "assets"), { maxAge: 31536000, immutable: true }));
  },
});

/**
 * Says plainly where to open the app. Under `npm run dev` this line sits between the API's log
 * lines, so it names both addresses in one block instead of Vite's single "Local:" line.
 */
const announce = (): Plugin => ({
  name: "rail-guide-announce",
  configureServer(server) {
    server.printUrls = () => {
      const app = server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`;
      const bold = (text: string) => `\x1b[1m\x1b[32m${text}\x1b[0m`;
      console.log(
        [
          "",
          `  ${bold("Operator app:")}  ${bold(app.replace(/\/$/, ""))}   <- open this`,
          `  API:           http://localhost:${apiPort}/api`,
          "",
        ].join("\n"),
      );
    };
  },
});

export default defineConfig({
  plugins: [react(), staticAssets(), announce()],
  server: {
    port: 5173,
    // The operator app imports the 3D toolkit from ../lib.
    fs: { allow: [projectRoot] },
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], restoreMocks: true },
});
