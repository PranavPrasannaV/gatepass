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
  },
});
