export const socialProviderIds = ["github", "google"] as const;

export type SocialProvider = (typeof socialProviderIds)[number];

type SocialProviderEnvName =
  | "GITHUB_CLIENT_ID"
  | "GITHUB_CLIENT_SECRET"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET";

export type SocialProviderEnv = Partial<Record<SocialProviderEnvName, string | null | undefined>>;

export function getConfiguredSocialProviders(bindings: SocialProviderEnv): SocialProvider[] {
  return socialProviderIds.filter((provider) => isSocialProviderConfigured(provider, bindings));
}

export function isSocialProviderConfigured(provider: SocialProvider, bindings: SocialProviderEnv) {
  if (provider === "github") {
    return hasValue(bindings.GITHUB_CLIENT_ID) && hasValue(bindings.GITHUB_CLIENT_SECRET);
  }

  return hasValue(bindings.GOOGLE_CLIENT_ID) && hasValue(bindings.GOOGLE_CLIENT_SECRET);
}

export function socialProviderDisplayName(provider: SocialProvider) {
  return provider === "github" ? "GitHub" : "Google";
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}
