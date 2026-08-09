import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "packages/**/*.spec.ts",
      "apps/**/*.spec.ts",
    ],
  },
  resolve: {
    alias: {
      "#": resolve(__dirname, "apps/web/src"),
      "@repo/core": resolve(__dirname, "packages/core/src"),
      "@repo/db": resolve(__dirname, "packages/db/src/index.ts"),
      "@repo/db/cms": resolve(__dirname, "packages/db/src/cms.ts"),
      "@repo/db/schema": resolve(__dirname, "packages/db/src/schema/index.ts"),
      "@repo/db/schema/cms": resolve(__dirname, "packages/db/src/schema/cms.sqlite.ts"),
      "@repo/auth": resolve(__dirname, "packages/auth/src"),
      "@repo/ui": resolve(__dirname, "packages/ui"),
    },
  },
});
