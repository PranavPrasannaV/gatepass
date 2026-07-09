import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts", "cli/**/test/**/*.test.ts"],
    passWithNoTests: false,
  },
});
