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
    port: 5173,
    // The operator app imports the 3D toolkit from ../lib.
    fs: { allow: [projectRoot] },
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        configure: (proxy) => {
          // While the API compiles, every /api call is refused. The app's connection banner already
          // covers a missing API, so that one error is not logged. Vite adds its own "error" listener
          // after this hook runs, so the listener is wrapped as it is added. Other errors still reach it.
          const addListener = proxy.on.bind(proxy) as (event: string, listener: (...args: any[]) => void) => unknown;
          const refused = (error: NodeJS.ErrnoException & { errors?: NodeJS.ErrnoException[] }) =>
            error.code === "ECONNREFUSED" || error.errors?.some((each) => each.code === "ECONNREFUSED") === true;
          proxy.on = ((event: string, listener: (...args: any[]) => void) => {
            if (event !== "error") return addListener(event, listener);
            return addListener(event, (error, request, response, target) => {
              if (!refused(error)) return listener(error, request, response, target);
              if ("writeHead" in response && !response.headersSent) response.writeHead(502).end();
              else response.end();
            });
          }) as typeof proxy.on;
        },
      },
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], restoreMocks: true },
});
