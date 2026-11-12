import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Nest's dependency injection needs decorator metadata, which esbuild does not emit.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["test/globalSetup.ts"],
    setupFiles: ["test/setupEnv.ts"],
    // The database tests share one test database.
    fileParallelism: false,
    // The API logs a JSON line per request; keep the test report readable.
    silent: true,
  },
});
