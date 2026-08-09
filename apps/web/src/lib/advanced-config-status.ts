import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";

import { getEmailDeliveryStatus } from "#/lib/cms-email";

type OptionalEnvName =
  | "CMS_TURNSTILE_SECRET_KEY"
  | "GITHUB_CLIENT_ID"
  | "GITHUB_CLIENT_SECRET"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "VITE_TURNSTILE_SITE_KEY";
type EnvBindings = CloudflareBindings & Partial<Record<OptionalEnvName, string>>;

export type OptionalEnvStatus = {
  configured: boolean;
  missing: string[];
};

export type AdvancedConfigStatus = {
  email: ReturnType<typeof getEmailDeliveryStatus>;
  github: OptionalEnvStatus;
  google: OptionalEnvStatus;
  turnstile: OptionalEnvStatus;
};

export function getAdvancedConfigStatus(): AdvancedConfigStatus {
  const bindings = env as unknown as EnvBindings;

  return {
    email: getEmailDeliveryStatus(),
    github: requiredEnvStatus(bindings, ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]),
    google: requiredEnvStatus(bindings, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]),
    turnstile: requiredEnvStatus(bindings, ["VITE_TURNSTILE_SITE_KEY", "CMS_TURNSTILE_SECRET_KEY"]),
  };
}

function requiredEnvStatus(bindings: EnvBindings, names: OptionalEnvName[]) {
  const missing = names.filter((name) => !bindings[name]?.trim());

  return {
    configured: missing.length === 0,
    missing: missing.map(String),
  };
}
