import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/features/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    fileParallelism: false,
  },
});
