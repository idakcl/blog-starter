import "@tanstack/react-start/server-only";
import type { Asset, Post, SupportedLocale } from "@repo/core";
import { escapeHtml, localizePost, resolveLocale } from "@repo/core";
import { env } from "cloudflare:workers";

import { buildD1SiteExport, getD1SiteSettings } from "#/lib/cms-d1";
import { notifyBackupCompleted } from "#/lib/cms-email";
import { pruneExportBackups, storeExportZipBackup } from "#/lib/cms-r2";
import { createZip, type ZipEntryInput } from "#/lib/cms-zip";

export type SiteExportData = Awaited<ReturnType<typeof buildD1SiteExport>>;

export type ExportZipBundle = {
  filename: string;
  bytes: Uint8Array;
  data: SiteExportData;
  assetCount: number;
  missingAssetKeys: string[];
};

export async function buildExportZipBundle(locale: SupportedLocale): Promise<ExportZipBundle> {
  const data = await buildD1SiteExport(locale);
  const createdAt = data.exportedAt.replace(/[:.]/g, "-");
  const filename = `01mvp-blog-starter-${createdAt}.zip`;
  const assetEntries = await readAssetEntries(data.assets);
  const manifest = {
    exportedAt: data.exportedAt,
    locale: data.locale,
    format: "cloud-blog-cms-export-v1",
    counts: {
      posts: data.posts.length,
      series: data.series.length,
      comments: data.comments.length,
      assets: data.assets.length,
      bundledAssets: assetEntries.entries.length,
      missingAssets: assetEntries.missingKeys.length,
    },
  };

  const entries: ZipEntryInput[] = [
    textEntry("export/manifest.json", manifest),
    textEntry("export/site.json", data.site),
    textEntry("export/posts.json", data.posts),
    textEntry("export/series.json", data.series),
    textEntry("export/comments.json", data.comments),
    textEntry("export/assets.json", data.assets),
    textEntry("export/tags.json", data.tags),
    ...postEntries(data.posts, data.locale, data.site.url, assetEntries.replacements),
    ...assetEntries.entries,
  ];

  return {
    filename,
    bytes: createZip(entries, new Date(data.exportedAt)),
    data,
    assetCount: assetEntries.entries.length,
    missingAssetKeys: assetEntries.missingKeys,
  };
}

export async function createBackup() {
  const settings = await getD1SiteSettings("en").catch(() => undefined);
  const locale = resolveLocale(settings?.primaryLanguage);
  const bundle = await buildExportZipBundle(locale);
  const backup = await storeExportZipBackup(bundle.bytes, bundle.filename);
  const retentionDays = readRetentionDays();
  const pruned = await pruneExportBackups(retentionDays).catch(() => ({
    deletedKeys: [],
    retentionDays,
  }));
  await notifyBackupCompleted({
    backupKey: backup.key,
    sizeBytes: backup.sizeBytes,
    trigger: "manual",
    prunedCount: pruned.deletedKeys.length,
  });

  return {
    trigger: "manual" as const,
    backup,
    retentionDays,
    prunedKeys: pruned.deletedKeys,
    assetCount: bundle.assetCount,
    missingAssetKeys: bundle.missingAssetKeys,
    exportedAt: bundle.data.exportedAt,
  };
}

function textEntry(path: string, data: unknown): ZipEntryInput {
  return {
    path,
    data: `${JSON.stringify(data, null, 2)}\n`,
  };
}

function postEntries(
  posts: Array<Post & { comments?: unknown[] }>,
  locale: SupportedLocale,
  siteUrl: string,
  replacements: Map<string, string>,
): ZipEntryInput[] {
  const entries: ZipEntryInput[] = [];

  for (const post of posts) {
    entries.push(...localizedPostEntries(post, locale, siteUrl, replacements));

    for (const alternateLocale of ["en", "zh"] satisfies SupportedLocale[]) {
      if (alternateLocale === locale || !post.i18n?.contentMarkdown?.[alternateLocale]) {
        continue;
      }

      entries.push(...localizedPostEntries(post, alternateLocale, siteUrl, replacements, true));
    }
  }

  return entries;
}

function localizedPostEntries(
  post: Post & { comments?: unknown[] },
  locale: SupportedLocale,
  siteUrl: string,
  replacements: Map<string, string>,
  includeLocaleSuffix = false,
) {
  const localizedPost = localizePost(post, locale);
  const baseName = includeLocaleSuffix
    ? `${safePathSegment(post.slug)}.${locale}`
    : safePathSegment(post.slug);

  return [
    {
      path: `export/posts/${baseName}.md`,
      data: markdownForPost(localizedPost, siteUrl, replacements),
    },
    {
      path: `export/posts/${baseName}.html`,
      data: htmlForPost(localizedPost, siteUrl, replacements),
    },
  ];
}

function markdownForPost(post: Post, siteUrl: string, replacements: Map<string, string>) {
  const metadata = [
    ["title", post.title],
    ["slug", post.slug],
    ["status", post.status],
    ["source", post.source],
    ["publishedAt", post.publishedAt],
    ["updatedAt", post.updatedAt],
    ["authorName", post.authorName],
    ["series", post.series?.name ?? ""],
    ["coverImage", rewriteAssetReferences(post.coverImage, siteUrl, replacements)],
    ["seoTitle", post.seoTitle],
    ["seoDescription", post.seoDescription],
    ["commentsEnabled", String(post.commentsEnabled)],
  ] as const;
  const tags = post.tags.map((tag) => tag.name);
  const body = rewriteAssetReferences(post.contentMarkdown, siteUrl, replacements);

  return [
    "---",
    ...metadata.map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    "tags:",
    ...tags.map((tag) => `  - ${JSON.stringify(tag)}`),
    "---",
    "",
    body,
    "",
  ].join("\n");
}

function htmlForPost(post: Post, siteUrl: string, replacements: Map<string, string>) {
  const html = rewriteAssetReferences(post.contentHtml, siteUrl, replacements);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(post.seoTitle || post.title)}</title>`,
    `<meta name="description" content="${escapeHtml(post.seoDescription || post.excerpt)}">`,
    "</head>",
    "<body>",
    "<article>",
    `<h1>${escapeHtml(post.title)}</h1>`,
    html,
    "</article>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

async function readAssetEntries(assets: Asset[]) {
  const entries: ZipEntryInput[] = [];
  const replacements = new Map<string, string>();
  const missingKeys: string[] = [];

  for (const asset of assets) {
    const exportPath = `export/assets/${exportAssetPath(asset)}`;
    replacements.set(asset.url, `../assets/${exportAssetPath(asset)}`);
    replacements.set(asset.key, `../assets/${exportAssetPath(asset)}`);

    const object = await env.CMS_STORAGE.get(asset.key);

    if (!object?.body) {
      missingKeys.push(asset.key);
      continue;
    }

    const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
    entries.push({
      path: exportPath,
      data: bytes,
    });
  }

  return { entries, replacements, missingKeys };
}

function rewriteAssetReferences(value: string, siteUrl: string, replacements: Map<string, string>) {
  let output = value;

  for (const [source, target] of replacements.entries()) {
    output = output.split(source).join(target);

    if (source.startsWith("/")) {
      output = output.split(`${siteUrl.replace(/\/$/, "")}${source}`).join(target);
    }
  }

  return output;
}

function exportAssetPath(asset: Asset) {
  const keyPath = asset.key.replace(/^uploads\//, "");
  const segments = keyPath.split("/").map(safePathSegment).filter(Boolean);

  if (segments.length) {
    return segments.join("/");
  }

  return `${safePathSegment(asset.id)}-${safePathSegment(asset.filename)}`;
}

function safePathSegment(value: string) {
  const segment = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return segment || "untitled";
}

function readRetentionDays() {
  const value = Number(env.CMS_BACKUP_RETENTION_DAYS || "30");

  if (!Number.isFinite(value) || value < 1) {
    return 30;
  }

  return Math.floor(value);
}
