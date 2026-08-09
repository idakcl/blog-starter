import {
  escapeHtml,
  htmlToText,
  markdownToText,
  sanitizeHtml,
  type Asset,
  type ContentStatus,
  type Post,
  type SupportedLocale,
} from "@repo/core";

import { uploadAssetToR2 } from "#/lib/cms-r2";

type ImportMetadata = Record<string, string | string[] | boolean | undefined>;

export type ImportPostInput = Partial<{
  filename: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  contentMarkdown: string;
  contentHtml: string;
  status: ContentStatus;
  commentsEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  seriesId: string | null;
  seriesSlug: string | null;
  seriesName: string | null;
  publishedAt: string;
  locale: SupportedLocale;
  i18n: Post["i18n"];
}>;

export type ZipImportFile = {
  path: string;
  contentBase64?: string;
  contentText?: string;
  contentType?: string;
};

export type ZipImportInput = ImportPostInput &
  Partial<{
    contentBase64: string;
    files: ZipImportFile[];
  }>;

export type ZipImportResult = {
  post: ImportPostInput;
  assets: Asset[];
  selectedEntry: string | null;
  entries: string[];
  kind: "markdown" | "html" | "gallery";
};

export type ZipImportOptions = {
  uploadAssets?: boolean;
};

type ImportEntry = {
  path: string;
  data: Uint8Array;
  contentType: string;
};

type ImportedAsset = Asset & {
  importPath: string;
};

const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const markdownExtensions = new Set([".md", ".mdx"]);
const htmlExtensions = new Set([".html", ".htm"]);
const textDecoder = new TextDecoder();
const maxZipArchiveBytes = 20 * 1024 * 1024;
const maxZipEntries = 200;
const maxZipEntryBytes = 10 * 1024 * 1024;
const maxZipUncompressedBytes = 50 * 1024 * 1024;

export function parseMarkdownImport(input: ImportPostInput): ImportPostInput {
  const filename = input.filename ?? "imported-post.md";
  const parsed = parseFrontmatter(input.contentMarkdown ?? `# ${titleFromFilename(filename)}\n`);
  const metadata = parsed.metadata;
  const title =
    cleanString(input.title) ??
    metadataString(metadata, ["title"]) ??
    firstMarkdownHeading(parsed.content) ??
    titleFromFilename(filename);
  const contentMarkdown = ensureMarkdownTitle(parsed.content, title);
  const excerpt =
    cleanString(input.excerpt) ??
    metadataString(metadata, ["excerpt", "description"]) ??
    markdownExcerpt(contentMarkdown);

  return {
    title,
    slug: cleanString(input.slug) ?? metadataString(metadata, ["slug"]),
    excerpt,
    coverImage:
      cleanString(input.coverImage) ??
      metadataString(metadata, ["coverImage", "cover_image", "image", "ogImage"]),
    contentMarkdown,
    status: normalizeStatus(input.status ?? metadataString(metadata, ["status"])),
    commentsEnabled:
      input.commentsEnabled ?? metadataBoolean(metadata, ["commentsEnabled", "comments_enabled"]),
    seoTitle: cleanString(input.seoTitle) ?? metadataString(metadata, ["seoTitle", "seo_title"]),
    seoDescription:
      cleanString(input.seoDescription) ??
      metadataString(metadata, ["seoDescription", "seo_description"]) ??
      excerpt,
    tags: normalizeTags(input.tags ?? metadataValue(metadata, ["tags", "tag"])),
    seriesId: cleanString(input.seriesId),
    seriesSlug:
      cleanString(input.seriesSlug) ?? metadataString(metadata, ["seriesSlug", "series_slug"]),
    seriesName: cleanString(input.seriesName) ?? metadataString(metadata, ["series", "collection"]),
    publishedAt:
      cleanString(input.publishedAt) ??
      metadataString(metadata, ["publishedAt", "published_at", "date"]),
    locale: input.locale,
    i18n: input.i18n,
  };
}

export function parseHtmlImport(input: ImportPostInput): ImportPostInput {
  const filename = input.filename ?? "imported-page.html";
  const contentHtml = input.contentHtml ?? `<h1>${escapeHtml(titleFromFilename(filename))}</h1>`;
  const safeHtml = sanitizeHtml(contentHtml);
  const title =
    cleanString(input.title) ??
    extractHtmlTagText(contentHtml, "title") ??
    extractHtmlTagText(contentHtml, "h1") ??
    titleFromFilename(filename);
  const excerpt =
    cleanString(input.excerpt) ??
    extractMetaDescription(contentHtml) ??
    htmlToText(safeHtml).slice(0, 180);

  return {
    title,
    slug: cleanString(input.slug),
    excerpt,
    coverImage: cleanString(input.coverImage) ?? extractFirstImageSource(contentHtml),
    contentMarkdown: input.contentMarkdown ?? "",
    contentHtml: safeHtml,
    status: normalizeStatus(input.status),
    commentsEnabled: input.commentsEnabled,
    seoTitle: cleanString(input.seoTitle) ?? title,
    seoDescription: cleanString(input.seoDescription) ?? excerpt,
    tags: normalizeTags(input.tags),
    seriesId: cleanString(input.seriesId),
    seriesSlug: cleanString(input.seriesSlug),
    seriesName: cleanString(input.seriesName),
    publishedAt: cleanString(input.publishedAt),
    locale: input.locale,
    i18n: input.i18n,
  };
}

export async function parseZipImport(
  input: ZipImportInput,
  options: ZipImportOptions = {},
): Promise<ZipImportResult> {
  const entries = input.files?.length
    ? entriesFromFileManifest(input.files)
    : await entriesFromZipBase64(input.contentBase64);
  const contentEntries = entries.filter((entry) => !isIgnoredZipPath(entry.path));
  const uploadAssets = options.uploadAssets ?? true;
  const assets = uploadAssets
    ? await uploadImageEntries(contentEntries)
    : previewImageEntries(contentEntries);
  const markdownEntry = selectContentEntry(contentEntries, markdownExtensions);
  const htmlEntry = markdownEntry ? undefined : selectContentEntry(contentEntries, htmlExtensions);

  if (markdownEntry) {
    const markdown = rewriteMarkdownAssetLinks(
      textDecoder.decode(markdownEntry.data),
      markdownEntry.path,
      assets,
    );

    return {
      post: parseMarkdownImport({
        ...input,
        filename: markdownEntry.path,
        contentMarkdown: markdown,
      }),
      assets: stripImportPaths(assets),
      selectedEntry: markdownEntry.path,
      entries: contentEntries.map((entry) => entry.path),
      kind: "markdown",
    };
  }

  if (htmlEntry) {
    const html = rewriteHtmlAssetLinks(textDecoder.decode(htmlEntry.data), htmlEntry.path, assets);

    return {
      post: parseHtmlImport({
        ...input,
        filename: htmlEntry.path,
        contentHtml: html,
      }),
      assets: stripImportPaths(assets),
      selectedEntry: htmlEntry.path,
      entries: contentEntries.map((entry) => entry.path),
      kind: "html",
    };
  }

  if (assets.length) {
    const filename = input.filename ?? "gallery.zip";
    const title = cleanString(input.title) ?? titleFromFilename(filename);

    return {
      post: parseMarkdownImport({
        ...input,
        filename,
        title,
        contentMarkdown: [
          `# ${title}`,
          "",
          ...assets.map((asset) => `![${asset.filename}](${asset.url})`),
        ].join("\n"),
        tags: input.tags ?? ["gallery"],
      }),
      assets: stripImportPaths(assets),
      selectedEntry: null,
      entries: contentEntries.map((entry) => entry.path),
      kind: "gallery",
    };
  }

  throw new Error("ZIP import must contain Markdown, HTML, or image files.");
}

function stripImportPaths(assets: ImportedAsset[]): Asset[] {
  return assets.map(({ importPath: _importPath, ...asset }) => asset);
}

function parseFrontmatter(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return { metadata: {} as ImportMetadata, content: normalized };
  }

  const end = normalized.indexOf("\n---\n", 4);

  if (end === -1) {
    return { metadata: {} as ImportMetadata, content: normalized };
  }

  return {
    metadata: parseSimpleYaml(normalized.slice(4, end)),
    content: normalized.slice(end + 5).trimStart(),
  };
}

function parseSimpleYaml(input: string): ImportMetadata {
  const metadata: ImportMetadata = {};
  let currentListKey: string | null = null;

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const listItem = /^-\s+(.+)$/.exec(line);

    if (listItem && currentListKey) {
      const current = metadata[currentListKey];
      metadata[currentListKey] = [
        ...(Array.isArray(current) ? current : []),
        cleanYamlValue(listItem[1]),
      ];
      continue;
    }

    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);

    if (!pair) {
      currentListKey = null;
      continue;
    }

    const [, key, value] = pair;

    if (!value) {
      metadata[key] = [];
      currentListKey = key;
      continue;
    }

    currentListKey = null;
    metadata[key] = parseYamlValue(value);
  }

  return metadata;
}

function parseYamlValue(value: string) {
  const trimmed = value.trim();

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => cleanYamlValue(item))
      .filter(Boolean);
  }

  return cleanYamlValue(trimmed);
}

function cleanYamlValue(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function metadataValue(metadata: ImportMetadata, keys: string[]) {
  for (const key of keys) {
    if (metadata[key] !== undefined) {
      return metadata[key];
    }
  }

  return undefined;
}

function metadataString(metadata: ImportMetadata, keys: string[]) {
  const value = metadataValue(metadata, keys);

  return cleanString(
    Array.isArray(value) ? value[0] : typeof value === "boolean" ? String(value) : value,
  );
}

function metadataBoolean(metadata: ImportMetadata, keys: string[]) {
  const value = metadataValue(metadata, keys);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string" && /^(true|false)$/i.test(value)) {
    return value.toLowerCase() === "true";
  }

  return undefined;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(String(item)))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => cleanString(item))
      .filter((item): item is string => Boolean(item));
  }

  return undefined;
}

function normalizeStatus(value: unknown): ContentStatus {
  return value === "published" || value === "scheduled" || value === "archived" ? value : "draft";
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstMarkdownHeading(markdown: string) {
  return markdown
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();
}

function ensureMarkdownTitle(markdown: string, title: string) {
  const content = markdown.trim();

  return content ? content : `# ${title}\n`;
}

function markdownExcerpt(markdown: string) {
  return markdownToText(markdown).slice(0, 180);
}

function titleFromFilename(filename: string) {
  const lastSegment = filename.split(/[\\/]/).pop() || "Imported post";
  return (
    lastSegment
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Imported post"
  );
}

function extractHtmlTagText(html: string, tag: "h1" | "title") {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(html);
  return match ? decodeHtmlEntities(htmlToText(match[1])) : undefined;
}

function extractMetaDescription(html: string) {
  const match =
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html) ??
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i.exec(html);

  return match ? decodeHtmlEntities(match[1]) : undefined;
}

function extractFirstImageSource(html: string) {
  const match = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i.exec(html);
  return cleanString(match?.[1]);
}

function rewriteMarkdownAssetLinks(
  markdown: string,
  markdownPath: string,
  assets: ImportedAsset[],
) {
  return markdown.replace(/!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (match, alt, href) => {
    const asset = resolveAssetForReference(markdownPath, href, assets);
    return asset ? `![${alt}](${asset.url})` : match;
  });
}

function rewriteHtmlAssetLinks(html: string, htmlPath: string, assets: ImportedAsset[]) {
  return html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, src, suffix) => {
      const asset = resolveAssetForReference(htmlPath, src, assets);
      return asset ? `${prefix}${asset.url}${suffix}` : match;
    },
  );
}

function resolveAssetForReference(sourcePath: string, href: string, assets: ImportedAsset[]) {
  if (/^(https?:|data:|#|\/)/i.test(href)) {
    return undefined;
  }

  const targetPath = normalizeZipPath(
    resolveRelativePath(sourcePath, href.split(/[?#]/)[0] ?? href),
  );

  return (
    assets.find((asset) => asset.importPath === targetPath) ??
    assets.find((asset) => normalizeZipPath(asset.filename) === filenameForPath(targetPath))
  );
}

function resolveRelativePath(sourcePath: string, target: string) {
  const sourceParts = normalizeZipPath(sourcePath).split("/");
  sourceParts.pop();

  for (const part of target.split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      sourceParts.pop();
      continue;
    }

    sourceParts.push(part);
  }

  return sourceParts.join("/");
}

async function uploadImageEntries(entries: ImportEntry[]) {
  const imageEntries = entries.filter((entry) => imageExtensions.has(extensionForPath(entry.path)));
  const assets: ImportedAsset[] = [];

  for (const entry of imageEntries) {
    const asset = await uploadAssetToR2({
      filename: filenameForPath(entry.path),
      contentType: entry.contentType,
      data: entry.data,
    });
    assets.push({
      ...asset,
      importPath: entry.path,
    });
  }

  return assets;
}

function previewImageEntries(entries: ImportEntry[]) {
  return entries
    .filter((entry) => imageExtensions.has(extensionForPath(entry.path)))
    .map((entry) => {
      const filename = filenameForPath(entry.path);

      return {
        id: `asset_preview_${entry.path}`,
        key: entry.path,
        url: entry.path,
        filename,
        contentType: entry.contentType,
        sizeBytes: entry.data.byteLength,
        createdAt: new Date(0).toISOString(),
        attachedPostId: null,
        importPath: entry.path,
      } satisfies ImportedAsset;
    });
}

function selectContentEntry(entries: ImportEntry[], extensions: Set<string>) {
  const candidates = entries.filter((entry) => extensions.has(extensionForPath(entry.path)));

  return (
    candidates.find((entry) => /(^|\/)(index|post|article|readme)\.[^.]+$/i.test(entry.path)) ??
    candidates[0]
  );
}

function entriesFromFileManifest(files: ZipImportFile[]) {
  assertZipEntryCount(files.length);

  let totalBytes = 0;

  return files
    .map((file) => {
      const path = normalizeZipPath(file.path);
      const data = file.contentBase64
        ? decodeBase64(file.contentBase64)
        : new TextEncoder().encode(file.contentText ?? "");

      assertZipEntrySize(path, data.byteLength);
      totalBytes += data.byteLength;
      assertZipTotalSize(totalBytes);

      return {
        path,
        data,
        contentType: file.contentType ?? contentTypeForPath(path),
      } satisfies ImportEntry;
    })
    .filter((entry) => entry.path && !entry.path.endsWith("/"));
}

async function entriesFromZipBase64(contentBase64: string | undefined) {
  if (!contentBase64) {
    throw new Error("ZIP import requires contentBase64 or files.");
  }

  const archiveSize = Math.floor((contentBase64.length * 3) / 4);

  if (archiveSize > maxZipArchiveBytes) {
    throw new Error(`ZIP archive must be ${formatBytes(maxZipArchiveBytes)} or smaller.`);
  }

  return parseZipEntries(decodeBase64(contentBase64));
}

async function parseZipEntries(data: Uint8Array) {
  const eocdOffset = findEndOfCentralDirectory(data);

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP archive.");
  }

  const entryCount = readUint16(data, eocdOffset + 10);
  assertZipEntryCount(entryCount);

  let offset = readUint32(data, eocdOffset + 16);
  const entries: ImportEntry[] = [];
  let totalUncompressedBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(data, offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory.");
    }

    const flags = readUint16(data, offset + 8);
    const method = readUint16(data, offset + 10);
    const compressedSize = readUint32(data, offset + 20);
    const uncompressedSize = readUint32(data, offset + 24);
    const filenameLength = readUint16(data, offset + 28);
    const extraLength = readUint16(data, offset + 30);
    const commentLength = readUint16(data, offset + 32);
    const localHeaderOffset = readUint32(data, offset + 42);
    const rawPath = textDecoder.decode(data.slice(offset + 46, offset + 46 + filenameLength));
    const path = normalizeZipPath(rawPath);

    offset += 46 + filenameLength + extraLength + commentLength;

    if (!path || path.endsWith("/") || isIgnoredZipPath(path)) {
      continue;
    }

    if (flags & 0x1) {
      throw new Error(`Encrypted ZIP entries are not supported: ${path}`);
    }

    assertZipEntrySize(path, Math.max(compressedSize, uncompressedSize));
    totalUncompressedBytes += uncompressedSize;
    assertZipTotalSize(totalUncompressedBytes);

    const localFilenameLength = readUint16(data, localHeaderOffset + 26);
    const localExtraLength = readUint16(data, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;
    const compressed = data.slice(dataStart, dataStart + compressedSize);
    const inflated = await inflateZipEntry(compressed, method, path);

    assertZipEntrySize(path, inflated.byteLength);

    entries.push({
      path,
      data: inflated,
      contentType: contentTypeForPath(path),
    });
  }

  return entries;
}

function assertZipEntryCount(count: number) {
  if (count > maxZipEntries) {
    throw new Error(`ZIP import supports up to ${maxZipEntries} files.`);
  }
}

function assertZipEntrySize(path: string, size: number) {
  if (size > maxZipEntryBytes) {
    throw new Error(`${path || "ZIP entry"} must be ${formatBytes(maxZipEntryBytes)} or smaller.`);
  }
}

function assertZipTotalSize(size: number) {
  if (size > maxZipUncompressedBytes) {
    throw new Error(
      `ZIP import contents must be ${formatBytes(maxZipUncompressedBytes)} or smaller.`,
    );
  }
}

function findEndOfCentralDirectory(data: Uint8Array) {
  const minimumOffset = Math.max(0, data.length - 0xffff - 22);

  for (let offset = data.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(data, offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

async function inflateZipEntry(data: Uint8Array, method: number, path: string) {
  if (method === 0) {
    return data;
  }

  if (method !== 8) {
    throw new Error(`Unsupported ZIP compression method ${method} for ${path}`);
  }

  const Decompression = (
    globalThis as {
      DecompressionStream?: new (format: string) => TransformStream<Uint8Array, Uint8Array>;
    }
  ).DecompressionStream;

  if (!Decompression) {
    throw new Error("ZIP deflate decompression is not available in this runtime.");
  }

  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);

  const stream = new Blob([buffer]).stream().pipeThrough(new Decompression("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readUint16(data: Uint8Array, offset: number) {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data: Uint8Array, offset: number) {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  );
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function normalizeZipPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/");
}

function isIgnoredZipPath(path: string) {
  return path.startsWith("__MACOSX/") || path.split("/").some((part) => part.startsWith("."));
}

function filenameForPath(path: string) {
  return normalizeZipPath(path).split("/").pop() || "import-file";
}

function extensionForPath(path: string) {
  const match = /\.[^.]+$/.exec(path.toLowerCase());
  return match?.[0] ?? "";
}

function contentTypeForPath(path: string) {
  const extension = extensionForPath(path);

  if (extension === ".avif") return "image/avif";
  if (extension === ".gif") return "image/gif";
  if (extension === ".htm" || extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".jpeg" || extension === ".jpg") return "image/jpeg";
  if (extension === ".md" || extension === ".mdx") return "text/markdown; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".webp") return "image/webp";

  return "application/octet-stream";
}

function formatBytes(bytes: number) {
  return `${Math.floor(bytes / 1024 / 1024)} MB`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
