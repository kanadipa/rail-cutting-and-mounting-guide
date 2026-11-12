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

export default defineConfig({
  plugins: [react(), staticAssets()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    // The operator app imports the 3D toolkit from ../lib.
    fs: { allow: [projectRoot] },
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], restoreMocks: true },
});
