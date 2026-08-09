import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { AuthDatabase } from "@repo/db";
import { account, session, user, verification } from "@repo/db/schema";
import { betterAuth } from "better-auth/minimal";

export type BlogAuthEnv = {
  baseURL?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  secret?: string;
  /** Comma-separated extra origins to trust (e.g. a proxy/mirror domain the admin logs in from). */
  trustedOrigins?: string;
};

const authSchema = {
  user,
  session,
  account,
  verification,
};

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 30;
const SESSION_UPDATE_AGE = 60 * 60 * 24;

export function createBlogAuth(database: AuthDatabase, env: BlogAuthEnv) {
  const baseURL = normalizeBaseURL(env.baseURL);

  return betterAuth({
    baseURL,
    trustedOrigins: getTrustedOrigins(baseURL, env.trustedOrigins),
    secret: resolveSecret(env.secret, baseURL),
    telemetry: {
      enabled: false,
    },
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema: authSchema,
      transaction: false,
    }),

    user: {
      additionalFields: {
        role: {
          type: "string",
          input: false,
          required: true,
          defaultValue: "reader",
        },
        commentStatus: {
          type: "string",
          input: false,
          required: true,
          defaultValue: "active",
        },
        emailPreference: {
          type: "string",
          input: false,
          required: true,
          defaultValue: "none",
        },
        marketingOptOut: {
          type: "boolean",
          input: false,
          required: true,
          defaultValue: false,
        },
        commentReplyNotificationsEnabled: {
          type: "boolean",
          input: false,
          required: true,
          defaultValue: true,
        },
      },
    },

    // https://www.better-auth.com/docs/concepts/session-management#session-caching
    session: {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    socialProviders: getSocialProviders(env),

    // Admin and reader bootstrap go through app-owned routes; the public Better Auth sign-up route stays closed.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
    },
  });
}

function getSocialProviders(env: BlogAuthEnv) {
  const githubClientId = env.githubClientId?.trim();
  const githubClientSecret = env.githubClientSecret?.trim();
  const googleClientId = env.googleClientId?.trim();
  const googleClientSecret = env.googleClientSecret?.trim();
  const providers: {
    github?: { clientId: string; clientSecret: string };
    google?: { clientId: string; clientSecret: string };
  } = {};

  if (githubClientId && githubClientSecret) {
    providers.github = {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    };
  }

  if (googleClientId && googleClientSecret) {
    providers.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    };
  }

  return Object.keys(providers).length ? providers : undefined;
}

function normalizeBaseURL(value: string | undefined) {
  return value?.trim().replace(/\/$/, "") || undefined;
}

function resolveSecret(secret: string | undefined, baseURL: string | undefined) {
  const value = secret?.trim();

  if (value) {
    return value;
  }

  if (isLocalBaseURL(baseURL)) {
    return "blog-starter-local-dev-better-auth-secret";
  }

  throw new Error("BETTER_AUTH_SECRET is required for Better Auth");
}

function getTrustedOrigins(baseURL: string | undefined, extra?: string) {
  const origins = new Set<string>();
  const origin = getBaseOrigin(baseURL);

  if (origin) {
    origins.add(origin);

    if (isLocalBaseURL(baseURL)) {
      origins.add("http://localhost:*");
      origins.add("http://127.0.0.1:*");
      origins.add("http://[::1]:*");
    }
  }

  // Always trust our own domains (custom domain + workers.dev fallback), http & https,
  // so login works regardless of which of our hostnames the admin actually opens.
  for (const domain of ["nyc.mn", "workers.dev"]) {
    origins.add(`https://*.${domain}`);
    origins.add(`http://*.${domain}`);
  }

  // Optional explicit origins (comma-separated) for proxied / mirror domains.
  if (extra) {
    for (const item of extra.split(",")) {
      const trimmed = item.trim();

      if (trimmed) {
        origins.add(trimmed);
      }
    }
  }

  return [...origins];
}

function getBaseOrigin(baseURL: string | undefined) {
  if (!baseURL) {
    return undefined;
  }

  try {
    return new URL(baseURL).origin;
  } catch {
    return undefined;
  }
}

function isLocalBaseURL(baseURL: string | undefined) {
  if (!baseURL) {
    return false;
  }

  try {
    const hostname = new URL(baseURL).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}
