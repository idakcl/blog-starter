import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage renders and links to the blog", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    await page.getByRole("button", { name: "View all posts" }).click();
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.getByRole("heading", { name: "Durable publishing notes" })).toBeVisible();
  });

  test("blog list page loads", async ({ page }) => {
    await page.goto("/blog?q=&tag=&page=1");
    await expect(page.getByRole("heading", { name: "Durable publishing notes" })).toBeVisible();
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("article detail page or empty blog state loads", async ({ page }) => {
    await page.goto("/blog?q=&tag=&page=1");
    const articleLinks = page.locator('main a[href^="/blog/"]');
    const articleCount = await articleLinks.count();

    if (articleCount === 0) {
      await expect(page.getByText("No posts matched this search.")).toBeVisible();
      return;
    }

    const firstArticle = articleLinks.first();
    const href = await firstArticle.getAttribute("href");
    expect(href).toMatch(/^\/blog\/[^/]+/);

    await firstArticle.click();
    await expect(page.locator("article, main, [role='main']").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("theme preset switcher works", async ({ page }) => {
    await page.goto("/");
    await page.addStyleTag({
      content:
        '[data-testid="tanstack_devtools"]{display:none!important;pointer-events:none!important;}',
    });

    const root = page.locator("body > div[data-theme-preset][data-layout-preset]");
    await expect(root).toBeVisible();

    const initialTheme = await root.getAttribute("data-theme-preset");
    expect(initialTheme).toBeTruthy();

    // Click the style preset switcher button
    const switcher = page.locator("[data-style-preset-switcher]");
    await expect(switcher).toBeVisible();

    await switcher.click();
    await page.waitForTimeout(200);
    const newTheme = await root.getAttribute("data-theme-preset");
    expect(newTheme).toBeTruthy();
    expect(newTheme).not.toBe(initialTheme);
  });

  test("login page loads and protected admin redirects", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("RSS feed returns valid XML", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("xml");
    const body = await response.text();
    expect(body).toContain("<rss");
    expect(body).toContain("<channel>");
  });

  test("sitemap returns valid XML", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<?xml");
    expect(body).toContain("<urlset");
  });

  test("docs and about routes load", async ({ page }) => {
    let response = await page.goto("/docs");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading").first()).toBeVisible();

    response = await page.goto("/zh/docs");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading").first()).toBeVisible();

    response = await page.goto("/about");
    expect(response?.status()).toBeLessThan(500);
  });
});
