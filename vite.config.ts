import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `npm run demo` serves demo/index.html. `data/` and `assets/` are served as-is, so a URL like
// /assets/glb/<file>.glb or /data/placement.json works from the browser.
export default defineConfig({
  root: ".",
  publicDir: false,
  plugins: [react()],
  server: { open: "/demo/index.html" },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
