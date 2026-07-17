import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/test/**/*.test.ts",
      "cli/**/test/**/*.test.ts",
      "runner/**/test/**/*.test.ts",
      "benchmark/**/test/**/*.test.ts",
      "apps/**/test/**/*.test.ts",
    ],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**"],
      exclude: ["**/*.test.ts", "**/node_modules/**"],
    },
  },
});
