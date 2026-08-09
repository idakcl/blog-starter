import { expect, test, type Page } from "@playwright/test";

import { sameOriginHeaders } from "./request";

const localAdmin = {
  email: process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test",
  password: process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1",
};

test.describe("Comments", () => {
  test("signs up and logs in a reader before submitting a comment", async ({ page }) => {
    test.setTimeout(120_000);

    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const postTitle = `E2E comment flow ${runId}`;
    const postSlug = `e2e-comment-flow-${runId}`;
    const readerName = `E2E Reader ${runId}`;
    const readerEmail = `reader-${runId}@example.test`;
    const commentBody = `E2E visible comment ${runId}`;
    const clientIp = `2001:db8::${runId.replaceAll("-", "")}`;

    await logInAsLocalAdmin(page);
    await ensureCommentSettings(page);

    const createPostResponse = await page.context().request.post("/api/posts", {
      data: {
        title: postTitle,
        slug: postSlug,
        excerpt: "Post used by the Playwright comment flow.",
        contentMarkdown: `# ${postTitle}\n\nThis post is created by the comment e2e flow.`,
        status: "published",
        commentsEnabled: true,
      },
      headers: sameOriginHeaders(),
    });
    expect(createPostResponse.status()).toBe(201);

    await page.context().clearCookies();
    await page.route("**/api/comments", async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "x-forwarded-for": clientIp,
        },
      });
    });

    await page.goto(`/blog/${postSlug}#comments`, { waitUntil: "domcontentloaded" });
    const comments = page.locator("#comments");
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();
    await expect(comments.getByRole("heading", { name: "Comments" })).toBeVisible();

    await comments.getByRole("button", { name: "Create email account" }).click();
    await comments.locator("#comment-auth-name").fill(readerName);
    await comments.locator("#comment-auth-email").fill(readerEmail);
    await comments.locator("#comment-auth-password").fill("password123");
    await comments.getByRole("button", { name: "Sign up" }).click();
    await expect(comments.getByText(`Commenting as ${readerName}`)).toBeVisible();

    await page.context().clearCookies();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      comments.getByRole("heading", { name: "Login required to comment" }),
    ).toBeVisible();
    await comments.locator("#comment-auth-email").fill(readerEmail);
    await comments.locator("#comment-auth-password").fill("password123");
    await comments.getByRole("button", { name: "Login" }).click();
    await expect(comments.getByText(`Commenting as ${readerName}`)).toBeVisible();

    const createCommentResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/comments") && response.request().method() === "POST",
    );
    await comments.locator("#comment-body").fill(commentBody);
    await comments.getByRole("button", { name: "Submit comment" }).click();

    const commentResponse = await createCommentResponse;
    expect(commentResponse.status()).toBe(201);
    await expect(page.getByText("Comment received. It will appear after review.")).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText(commentBody)).toBeVisible();

    await page.context().clearCookies();
    await logInAsLocalAdmin(page);
    const commentsResponse = await page.context().request.get("/api/comments");
    expect(commentsResponse.status()).toBe(200);
    const commentsPayload = (await commentsResponse.json()) as {
      data?: Array<{
        id?: string;
        body?: string;
      }>;
    };
    const persistedComment = commentsPayload.data?.find((comment) => comment.body === commentBody);
    expect(persistedComment?.id).toBeTruthy();

    const approveResponse = await page
      .context()
      .request.post(`/api/comments/${persistedComment?.id}/approve`, {
        headers: sameOriginHeaders(),
      });
    expect(approveResponse.status()).toBe(200);

    await page.context().clearCookies();
    await page.goto(`/blog/${postSlug}#comments`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(readerName)).toBeVisible();
    await expect(page.getByText(commentBody)).toBeVisible();
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

async function ensureCommentSettings(page: Page) {
  const response = await page.context().request.put("/api/site", {
    data: {
      commentsEnabled: true,
      commentsRequireApproval: true,
      emailVerificationEnabled: false,
    },
    headers: sameOriginHeaders(),
  });

  expect(response.status()).toBe(200);
}
