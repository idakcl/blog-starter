import { describe, expect, it } from "vitest";

import {
  getConfiguredSocialProviders,
  isSocialProviderConfigured,
  socialProviderDisplayName,
  type SocialProviderEnv,
} from "../social-providers";

describe("social provider configuration", () => {
  it("requires both GitHub client id and secret", () => {
    expect(isSocialProviderConfigured("github", {})).toBe(false);
    expect(isSocialProviderConfigured("github", { GITHUB_CLIENT_ID: "id" })).toBe(false);
    expect(
      isSocialProviderConfigured("github", {
        GITHUB_CLIENT_ID: "id",
        GITHUB_CLIENT_SECRET: "secret",
      }),
    ).toBe(true);
  });

  it("requires both Google client id and secret", () => {
    expect(isSocialProviderConfigured("google", {})).toBe(false);
    expect(isSocialProviderConfigured("google", { GOOGLE_CLIENT_SECRET: "secret" })).toBe(false);
    expect(
      isSocialProviderConfigured("google", {
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    ).toBe(true);
  });

  it("trims blank provider values", () => {
    const env: SocialProviderEnv = {
      GITHUB_CLIENT_ID: " ",
      GITHUB_CLIENT_SECRET: "secret",
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "\t",
    };

    expect(getConfiguredSocialProviders(env)).toEqual([]);
  });

  it("returns configured providers in login display order", () => {
    expect(
      getConfiguredSocialProviders({
        GITHUB_CLIENT_ID: "github-id",
        GITHUB_CLIENT_SECRET: "github-secret",
        GOOGLE_CLIENT_ID: "google-id",
        GOOGLE_CLIENT_SECRET: "google-secret",
      }),
    ).toEqual(["github", "google"]);
  });

  it("formats provider display names", () => {
    expect(socialProviderDisplayName("github")).toBe("GitHub");
    expect(socialProviderDisplayName("google")).toBe("Google");
  });
});
