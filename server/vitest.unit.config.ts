import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// The tests that need no database: the pure rules and the plan validation.
// `npm test` runs everything, with the test database.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/import/validatePlan.test.ts"],
    silent: true,
  },
});
