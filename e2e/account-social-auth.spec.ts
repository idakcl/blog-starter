import { expect, test } from "@playwright/test";

const accountSocialProviders = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
] as const;

test.describe("Account social authentication", () => {
  test("does not expose unavailable social login providers", async ({ page, request }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(page.locator('form[action="/api/account/login"]')).toBeVisible();

    for (const provider of accountSocialProviders) {
      await expect(page.getByRole("link", { name: new RegExp(provider.label) })).toHaveCount(0);

      const response = await request.get(
        `/api/account/login/${provider.id}/start?redirectTo=%2Fapp`,
      );
      expect(response.status()).toBe(503);
      await expect(response.json()).resolves.toEqual({
        error: `${provider.label} login is not configured`,
      });
    }
  });
});
