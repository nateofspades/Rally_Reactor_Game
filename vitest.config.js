import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.js"], maxWorkers: 1, testTimeout: 30000 },
});
