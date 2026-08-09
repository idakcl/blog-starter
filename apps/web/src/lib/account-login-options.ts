import { createServerFn } from "@tanstack/react-start";

import {
  getConfiguredSocialProviders,
  type SocialProvider,
  type SocialProviderEnv,
} from "#/lib/social-providers";

export type AccountLoginOptions = {
  socialProviders: SocialProvider[];
};

export const $getAccountLoginOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccountLoginOptions> => {
    const { env } = await import("cloudflare:workers");

    return {
      socialProviders: getConfiguredSocialProviders(env as SocialProviderEnv),
    };
  },
);
