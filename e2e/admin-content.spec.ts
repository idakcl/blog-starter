import { expect, test, type Page } from "@playwright/test";

import { sameOriginHeaders } from "./request";

const localAdmin = {
  email: process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test",
  password: process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1",
};

test.describe("Admin content management", () => {
  test("publishes, updates, and deletes a post through the admin API", async ({ page }) => {
    await logInAsLocalAdmin(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const draftTitle = `E2E publish lifecycle ${runId}`;
    const draftSlug = `e2e-publish-lifecycle-${runId}`;
    const publishedTitle = `E2E published lifecycle ${runId}`;
    const publishedSlug = `e2e-published-lifecycle-${runId}`;

    const createResponse = await page.context().request.post("/api/posts", {
      data: {
        title: draftTitle,
        slug: draftSlug,
        excerpt: "Post used by the Playwright publish lifecycle test.",
        contentMarkdown: `# ${draftTitle}\n\nCreated as a draft before publication.`,
        status: "draft",
        commentsEnabled: true,
      },
      headers: sameOriginHeaders(),
    });
    expect(createResponse.status()).toBe(201);

    const created = (await createResponse.json()) as {
      data?: {
        id?: string;
        slug?: string;
        status?: string;
      };
    };
    const postId = created.data?.id;
    expect(postId).toBeTruthy();
    expect(created.data).toMatchObject({
      slug: draftSlug,
      status: "draft",
    });

    const publishResponse = await page.context().request.patch(`/api/posts/${postId}`, {
      data: {
        title: publishedTitle,
        slug: publishedSlug,
        excerpt: "Published and updated by the Playwright lifecycle test.",
        contentMarkdown: `# ${publishedTitle}\n\nPublished through the admin API.`,
        status: "published",
      },
      headers: sameOriginHeaders(),
    });
    expect(publishResponse.status()).toBe(200);

    const published = (await publishResponse.json()) as {
      data?: {
        slug?: string;
        status?: string;
        title?: string;
      };
    };
    expect(published.data).toMatchObject({
      slug: publishedSlug,
      status: "published",
      title: publishedTitle,
    });

    const publicResponse = await page.goto(`/blog/${publishedSlug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(publicResponse?.status(), "published post should load publicly").toBeLessThan(500);
    await expect(page.getByRole("heading", { name: publishedTitle })).toBeVisible();

    const deleteResponse = await page.context().request.delete(`/api/posts/${postId}`, {
      headers: sameOriginHeaders(),
    });
    expect(deleteResponse.status()).toBe(200);
    const deleted = (await deleteResponse.json()) as { data?: { status?: string } };
    expect(deleted.data?.status).toBe("deleted");

    const deletedLookup = await page.context().request.get(`/api/posts/${postId}`);
    expect(deletedLookup.status()).toBe(404);

    const publicList = await page.context().request.get(`/api/posts?q=${publishedSlug}`);
    expect(publicList.status()).toBe(200);
    const publicListPayload = (await publicList.json()) as { data?: Array<{ id?: string }> };
    expect(publicListPayload.data?.some((post) => post.id === postId)).toBe(false);
  });

  test("persists comment moderation settings from the admin comments page", async ({ page }) => {
    await logInAsLocalAdmin(page);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const baselineKeywords = [`e2e-baseline-${runId}`];
    const blockedKeywords = [`e2e-block-${runId}`, `e2e-spam-${runId}`];

    const baselineResponse = await page.context().request.put("/api/site", {
      data: {
        aiCommentModerationEnabled: false,
        commentAutoBlockEnabled: false,
        commentBlockedKeywords: baselineKeywords,
        commentsEnabled: true,
        commentsRequireApproval: true,
      },
      headers: sameOriginHeaders(),
    });
    expect(baselineResponse.status()).toBe(200);

    await page.goto("/admin/comments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();

    const settingsForm = page.locator("form", {
      has: page.getByRole("heading", { name: "Comment settings" }),
    });
    await expect(settingsForm).toBeVisible();
    await expect(settingsForm.locator("#comment-blocked-keywords")).toHaveValue(
      baselineKeywords.join("\n"),
    );

    await settingsForm.locator('input[name="commentsEnabled"]').check();
    await settingsForm.locator('input[name="commentsRequireApproval"]').check();
    await settingsForm.locator('input[name="commentAutoBlockEnabled"]').check();
    await settingsForm.locator('input[name="aiCommentModerationEnabled"]').uncheck();
    await settingsForm.locator("#comment-blocked-keywords").fill(blockedKeywords.join("\n"));

    const saveResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/site") && response.request().method() === "PUT",
    );
    await settingsForm.getByRole("button", { name: /Save settings/ }).click();
    expect((await saveResponse).status()).toBe(200);

    await expect(settingsForm.getByText("Settings saved.")).toBeVisible();

    const siteResponse = await page.context().request.get("/api/site");
    expect(siteResponse.status()).toBe(200);
    const sitePayload = (await siteResponse.json()) as {
      data?: {
        aiCommentModerationEnabled?: boolean;
        commentAutoBlockEnabled?: boolean;
        commentBlockedKeywords?: string[];
        commentsEnabled?: boolean;
        commentsRequireApproval?: boolean;
      };
    };
    expect(sitePayload.data).toMatchObject({
      aiCommentModerationEnabled: false,
      commentAutoBlockEnabled: true,
      commentBlockedKeywords: blockedKeywords,
      commentsEnabled: true,
      commentsRequireApproval: true,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(settingsForm.locator('input[name="commentsEnabled"]')).toBeChecked();
    await expect(settingsForm.locator('input[name="commentsRequireApproval"]')).toBeChecked();
    await expect(settingsForm.locator('input[name="commentAutoBlockEnabled"]')).toBeChecked();
    await expect(
      settingsForm.locator('input[name="aiCommentModerationEnabled"]'),
    ).not.toBeChecked();
    await expect(settingsForm.locator("#comment-blocked-keywords")).toHaveValue(
      blockedKeywords.join("\n"),
    );
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
