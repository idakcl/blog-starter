import { expect, test, type Page } from "@playwright/test";

import { sameOriginHeaders } from "./request";

const localAdmin = {
  email: process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test",
  password: process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1",
};

test.describe("Account preferences", () => {
  test("changes an email/password account password from the account page", async ({ page }) => {
    await prepareEmailPasswordSignup(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const email = `reader-password-${runId}@example.test`;
    const oldPassword = "password123";
    const newPassword = "password456";
    await signUpReaderAccount(page, {
      email,
      name: `Reader Password ${runId}`,
      password: oldPassword,
    });

    await gotoAccountPage(page);
    await page.locator("#current_password").fill(oldPassword);
    await page.locator("#new_password").fill(newPassword);
    await page.locator("#confirm_password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();

    await page.context().clearCookies();

    const oldLoginResponse = await page.context().request.post("/api/account/login", {
      data: { email, password: oldPassword },
      headers: sameOriginHeaders(),
    });
    expect(oldLoginResponse.status()).toBe(401);

    const newLoginResponse = await page.context().request.post("/api/account/login", {
      data: { email, password: newPassword },
      headers: sameOriginHeaders(),
    });
    expect(newLoginResponse.status()).toBe(200);
  });

  test("accepts password reset requests without exposing account existence", async ({
    request,
  }) => {
    const requestResponse = await request.post("/api/account/password-reset", {
      data: { email: "missing-reader@example.test" },
      headers: sameOriginHeaders(),
    });
    expect(requestResponse.status()).toBe(202);
    await expect(requestResponse.json()).resolves.toMatchObject({
      data: { accepted: true },
    });

    const invalidConfirmResponse = await request.post("/api/account/password-reset", {
      data: { token: "invalid-token", password: "password456" },
      headers: sameOriginHeaders(),
    });
    expect(invalidConfirmResponse.status()).toBe(400);
  });

  test("saves blog update and comment reply email preferences", async ({ page }) => {
    await prepareEmailPasswordSignup(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    await signUpReaderAccount(page, {
      email: `reader-preferences-${runId}@example.test`,
      name: `Reader Preferences ${runId}`,
      password: "password123",
    });

    await gotoAccountPage(page);

    const emailPreferenceRadios = page.locator('input[name="account-email-preference"]');
    await expect(emailPreferenceRadios).toHaveCount(2);
    await expect(page.locator('input[value="none"]')).toBeChecked();
    await expect(page.locator('input[value="weekly_blog_updates"]')).not.toBeChecked();

    await page.locator("label", { hasText: "Weekly blog updates" }).click();
    await expectEmailPreferences(page, {
      emailPreference: "weekly_blog_updates",
      marketingOptOut: false,
    });
    await expect(page.locator('input[value="weekly_blog_updates"]')).toBeChecked();

    const commentReplyToggle = page.locator("#account-comment-reply-notifications");
    await expect(commentReplyToggle).toBeChecked();
    await commentReplyToggle.click();
    await expect(commentReplyToggle).not.toBeChecked();
    await expectEmailPreferences(page, {
      commentReplyNotificationsEnabled: false,
    });

    await page.getByRole("button", { name: "Pause updates" }).click();
    await expect(page.getByRole("button", { name: "Resume updates" })).toBeVisible();
    await expect(page.locator('input[value="none"]')).toBeChecked();

    await expectEmailPreferences(page, {
      commentReplyNotificationsEnabled: false,
      emailPreference: "none",
      marketingOptOut: true,
    });
  });
});

async function expectEmailPreferences(
  page: Page,
  expected: {
    commentReplyNotificationsEnabled?: boolean;
    emailPreference?: string;
    marketingOptOut?: boolean;
  },
) {
  for (const [key, value] of Object.entries(expected)) {
    await expect
      .poll(
        async () => {
          const preferencesResponse = await page
            .context()
            .request.get("/api/account/email-preferences");
          expect(preferencesResponse.status()).toBe(200);

          const payload = (await preferencesResponse.json()) as {
            data?: Record<string, unknown>;
          };
          return payload.data?.[key];
        },
        { timeout: 5_000 },
      )
      .toBe(value);
  }
}

async function prepareEmailPasswordSignup(page: Page) {
  await logInAsLocalAdmin(page);

  const response = await page.context().request.put("/api/site", {
    data: {
      emailVerificationEnabled: false,
    },
    headers: sameOriginHeaders(),
  });
  expect(response.status()).toBe(200);

  await page.context().clearCookies();
}

async function signUpReaderAccount(
  page: Page,
  input: {
    email: string;
    name: string;
    password: string;
  },
) {
  const signupResponse = await page.context().request.post("/api/account/signup", {
    data: input,
    headers: sameOriginHeaders(),
  });
  expect(signupResponse.status()).toBe(201);
}

async function logInAsLocalAdmin(page: Page) {
  await gotoLoginPage(page);
  await page.getByLabel("Email").fill(localAdmin.email);
  await page.getByLabel("Password").fill(localAdmin.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await page.getByRole("button", { name: /Open admin/ }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { name: "Publishing overview" })).toBeVisible();
}

async function gotoLoginPage(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    if ((await page.getByLabel("Email").count()) > 0) {
      await expect(page.getByLabel("Email")).toBeVisible({ timeout: 5_000 });
      return;
    }

    await page.waitForTimeout(1_000);
  }

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 5_000 });
}

async function gotoAccountPage(page: Page) {
  const preferencesLoad = page
    .waitForResponse(
      (response) =>
        response.url().endsWith("/api/account/email-preferences") &&
        response.request().method() === "GET",
      { timeout: 15_000 },
    )
    .catch(() => null);

  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

  const response = await preferencesLoad;
  if (response) {
    expect(response.status()).toBe(200);
  }
}
