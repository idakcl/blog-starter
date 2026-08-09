import { defineConfig } from "@playwright/test";

const webServerPort = Number(process.env.PLAYWRIGHT_PORT ?? "3000");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${webServerPort}`;
const localBetterAuthSecret =
  process.env.BETTER_AUTH_SECRET ??
  "playwright-local-better-auth-secret-change-me-before-production";
const webServerEnv = {
  ...definedProcessEnv(process.env),
  BETTER_AUTH_SECRET: localBetterAuthSecret,
  CMS_PUBLIC_SITE_URL: baseURL,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
  GITHUB_CLIENT_ID: process.env.PLAYWRIGHT_GITHUB_CLIENT_ID ?? "",
  GITHUB_CLIENT_SECRET: process.env.PLAYWRIGHT_GITHUB_CLIENT_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.PLAYWRIGHT_GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.PLAYWRIGHT_GOOGLE_CLIENT_SECRET ?? "",
  VITE_BASE_URL: baseURL,
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm dev:web -- --port ${webServerPort}`,
        env: webServerEnv,
        port: webServerPort,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});

function definedProcessEnv(env: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
