import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { baseURL, sameOriginHeaders } from "./request";

const localAdmin = {
  email: process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test",
  password: process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1",
};

const adminRoutes = [
  { path: "/admin", heading: "Publishing overview" },
  { path: "/admin/posts", heading: "Posts" },
  { path: "/admin/series", heading: "Series" },
  { path: "/admin/assets", heading: "Assets" },
  { path: "/admin/comments", heading: "Comments" },
  { path: "/admin/users", heading: "Users" },
  { path: "/admin/settings", heading: "Site settings" },
] as const;

test.describe("Admin authentication", () => {
  test("rejects anonymous access to admin UI and APIs", async ({ page, request }) => {
    const meResponse = await request.get(
      "/api/admin/me?disableCookieCache=true&disableRefresh=true",
    );
    expect(meResponse.status()).toBe(401);

    const usersResponse = await request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(401);

    const pageResponse = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(pageResponse?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });

  test("logs in as the local admin and loads core admin pages", async ({ page }) => {
    await logInAsLocalAdmin(page);

    const meResponse = await page
      .context()
      .request.get("/api/admin/me?disableCookieCache=true&disableRefresh=true");
    expect(meResponse.status()).toBe(200);
    await expectAdminPayload(meResponse);

    const usersResponse = await page.context().request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(200);

    for (const route of adminRoutes) {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.path} should not return a server error`).toBeLessThan(
        500,
      );
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
    }
  });

  test("shows a denied admin state for signed-in readers", async ({ page }) => {
    await prepareEmailPasswordSignup(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    await signUpReaderAccount(page, {
      email: `reader-admin-denied-${runId}@example.test`,
      name: `Reader Admin Denied ${runId}`,
      password: "password123",
    });

    const accountResponse = await page
      .context()
      .request.get("/api/account/me?disableCookieCache=true&disableRefresh=true");
    expect(accountResponse.status()).toBe(200);

    const adminMeResponse = await page
      .context()
      .request.get("/api/admin/me?disableCookieCache=true&disableRefresh=true");
    expect(adminMeResponse.status()).toBe(401);

    const usersResponse = await page.context().request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(401);

    const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole("heading", { name: "Admin area unavailable" })).toBeVisible();
    await expect(page.getByText("This account does not have admin access.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Publishing overview" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Posts/ })).toHaveCount(0);
  });

  test("keeps the public header in account state after login", async ({ page }) => {
    await logInAsLocalAdmin(page);

    const accountResponse = await page
      .context()
      .request.get("/api/account/me?disableCookieCache=true&disableRefresh=true");
    expect(accountResponse.status()).toBe(200);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);

    const header = page.locator("header");
    const accountButton = header.getByRole("button", { name: "Account" });

    await expect(accountButton).toBeVisible();
    await expect(header.getByRole("button", { name: "Login" })).toHaveCount(0);

    for (let index = 0; index < 3; index += 1) {
      await accountButton.hover();
      await page.waitForTimeout(150);
      await expect(accountButton).toBeVisible();
      await expect(header.getByRole("button", { name: "Login" })).toHaveCount(0);
    }
  });

  test("lets an admin send a reader reset email and revoke reader sessions", async ({
    browser,
    page,
  }) => {
    await prepareEmailPasswordSignup(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const email = `reader-admin-security-${runId}@example.test`;
    const readerContext = await browser.newContext({ baseURL });
    const readerPage = await readerContext.newPage();

    const signupResponse = await readerPage.context().request.post("/api/account/signup", {
      data: {
        email,
        name: `Reader Admin Security ${runId}`,
        password: "password123",
      },
      headers: sameOriginHeaders(),
    });
    expect(signupResponse.status()).toBe(201);

    const readerMeBefore = await readerPage
      .context()
      .request.get("/api/account/me?disableCookieCache=true&disableRefresh=true");
    expect(readerMeBefore.status()).toBe(200);

    await logInAsLocalAdmin(page);

    const usersResponse = await page.context().request.get("/api/admin/users");
    expect(usersResponse.status()).toBe(200);
    const usersPayload = (await usersResponse.json()) as {
      data?: Array<{ email?: string; id?: string }>;
    };
    const reader = usersPayload.data?.find((user) => user.email === email);
    expect(reader?.id).toBeTruthy();

    const resetResponse = await page
      .context()
      .request.post(`/api/admin/users/${reader?.id}/password-reset`, {
        headers: sameOriginHeaders(),
      });
    expect(resetResponse.status()).toBe(202);

    const revokeResponse = await page
      .context()
      .request.post(`/api/admin/users/${reader?.id}/sessions`, {
        headers: sameOriginHeaders(),
      });
    expect(revokeResponse.status()).toBe(200);

    const readerMeAfter = await readerPage
      .context()
      .request.get("/api/account/me?disableCookieCache=true&disableRefresh=true");
    expect(readerMeAfter.status()).toBe(401);

    await readerContext.close();
  });

  test("loads the new post editor without client runtime errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await logInAsLocalAdmin(page);

    const response = await page.goto("/admin/posts/new", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "new post editor should not return a server error").toBeLessThan(
      500,
    );
    await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editor" })).toBeVisible();
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("loads an existing post editor without client runtime errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await logInAsLocalAdmin(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const title = `E2E edit smoke ${runId}`;
    const createResponse = await page.context().request.post("/api/posts", {
      data: {
        title,
        slug: `e2e-edit-smoke-${runId}`,
        excerpt: "Post used by the Playwright admin edit smoke test.",
        contentMarkdown: [
          `# ${title}`,
          "",
          "This post intentionally includes Markdown that exercises the existing-post editor path.",
          "",
          "| Area | Status |",
          "| --- | --- |",
          "| Admin edit | Smoke tested |",
          "",
          "```tsx",
          "export function SmokeExample() {",
          '  return <span data-kind="admin-edit">covered</span>;',
          "}",
          "```",
        ].join("\n"),
        status: "draft",
        commentsEnabled: true,
      },
      headers: sameOriginHeaders(),
    });
    expect(createResponse.status()).toBe(201);

    const payload = (await createResponse.json()) as { data?: { id?: string } };
    const postId = payload.data?.id;
    expect(postId).toBeTruthy();

    const response = await page.goto(`/admin/posts/${postId}`, { waitUntil: "domcontentloaded" });
    expect(
      response?.status(),
      "existing post editor should not return a server error",
    ).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Edit post" })).toBeVisible();
    await expect(page.locator("#editor-title")).toHaveValue(title);
    await expect(
      page.locator('[contenteditable="true"], textarea[aria-label="Markdown source"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test("logs in with the native form fallback", async ({ browser }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('form[action="/api/account/login"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await page.locator("#email").fill(localAdmin.email);
    await page.locator("#password").fill(localAdmin.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/app\/?$/);
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await page.getByRole("button", { name: /Open admin/ }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole("heading", { name: "Publishing overview" })).toBeVisible();

    await context.close();
  });

  test("signs out of the admin shell", async ({ page }) => {
    await logInAsLocalAdmin(page);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    const meResponse = await page
      .context()
      .request.get("/api/admin/me?disableCookieCache=true&disableRefresh=true");
    expect(meResponse.status()).toBe(401);
  });
});

async function logInAsLocalAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(localAdmin.email);
  await page.getByLabel("Password").fill(localAdmin.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await page.getByRole("button", { name: /Open admin/ }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { name: "Publishing overview" })).toBeVisible();
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

  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
}

async function expectAdminPayload(response: APIResponse) {
  const payload = (await response.json()) as {
    data?: {
      email?: string;
      role?: string;
    };
  };

  expect(payload.data).toMatchObject({
    email: localAdmin.email,
    role: "admin",
  });
}
