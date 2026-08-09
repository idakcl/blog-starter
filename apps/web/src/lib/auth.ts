import "@tanstack/react-start/server-only";
import { createBlogAuth } from "@repo/auth/auth";
import { createAuthDb } from "@repo/db";
import { env } from "cloudflare:workers";

const database = env.CMS_DB as Parameters<typeof createAuthDb>[0];

export const auth = createBlogAuth(createAuthDb(database), {
  baseURL: getAuthBaseURL(),
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  secret: getBetterAuthSecret(),
});

function getAuthBaseURL() {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:3000";
  }

  return env.VITE_BASE_URL || env.CMS_PUBLIC_SITE_URL;
}

function getBetterAuthSecret() {
  const secret = env.BETTER_AUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (import.meta.env.DEV) {
    return "blog-starter-local-dev-better-auth-secret-change-before-production";
  }

  return undefined;
}
