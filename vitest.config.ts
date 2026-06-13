import { defineConfig } from "vitest/config";

// Vitest runs the unit tests only. Playwright owns the e2e/ specs
// (both use *.spec.ts, so e2e/ is explicitly excluded here).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
