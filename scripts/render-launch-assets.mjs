#!/usr/bin/env node

import { existsSync, mkdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const defaultOutDir = join(process.cwd(), "output", "2026-06-05-blog-starter-launch");
const outDir = resolve(process.argv[2] ?? defaultOutDir);
const coverHtml = join(outDir, "2026-06-05-ai-created-personal-blog-cover.html");
const xhsHtml = join(outDir, "2026-06-05-ai-created-personal-blog.xhs-slides.html");

for (const file of [coverHtml, xhsHtml]) {
  if (!existsSync(file)) {
    throw new Error(`Missing generated HTML: ${file}`);
  }
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

try {
  await renderCover();
  await renderSlides();
} finally {
  await browser.close();
}

async function renderCover() {
  const page = await browser.newPage({
    viewport: { width: 900, height: 383, deviceScaleFactor: 2 },
  });
  await page.goto(pathToFileURL(coverHtml).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const cover = await page.locator(".cover").elementHandle();
  if (!cover) {
    throw new Error("Cover element not found");
  }
  const outputPath = join(outDir, "2026-06-05-ai-created-personal-blog-cover.png");
  await cover.screenshot({ path: outputPath });
  await page.close();
  console.log(`Rendered ${outputPath}`);
}

async function renderSlides() {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1600, deviceScaleFactor: 2 },
  });
  await page.goto(pathToFileURL(xhsHtml).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".slide")).map((slide, index) => ({
      index,
      scrollWidth: slide.scrollWidth,
      clientWidth: slide.clientWidth,
      scrollHeight: slide.scrollHeight,
      clientHeight: slide.clientHeight,
    })),
  );

  const overflowed = overflow.filter(
    (item) => item.scrollWidth > item.clientWidth || item.scrollHeight > item.clientHeight,
  );

  if (overflowed.length > 0) {
    throw new Error(
      `Slide overflow: ${overflowed
        .map((item) => `${item.index + 1} ${item.scrollWidth}x${item.scrollHeight}`)
        .join(", ")}`,
    );
  }

  const handles = await page.locator(".slide").elementHandles();
  if (!handles.length) {
    throw new Error("No slides found");
  }

  const baseName = basename(xhsHtml, extname(xhsHtml)).replace(/\.xhs-slides$/, "");
  for (const [index, handle] of handles.entries()) {
    const outputPath = join(outDir, `${baseName}-${index + 1}.png`);
    await handle.screenshot({ path: outputPath });
    console.log(`Rendered ${outputPath}`);
  }

  await page.close();
}
