import "@tanstack/react-start/server-only";
import {
  htmlToText,
  markdownToText,
  renderMarkdownToHtml,
  sanitizeHtml,
  type Post,
  type Tag,
  normalizeDateInput,
  slugify,
} from "@repo/core";
import * as schema from "@repo/db/schema/cms";
import { eq, and, or, like, desc, asc, inArray, sql } from "drizzle-orm";

import { cachedGet, invalidateCache } from "./cms-cache";
import { getD1SiteSettings } from "./cms-d1-assets";
import { hasSeriesInput, resolveD1SeriesId } from "./cms-d1-series";
import {
  MAX_EXCERPT_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  type PostInput,
  type ListPostsOptions,
  drizzleRowToPost,
  drizzleRowToPostExternalSource,
  drizzleRowToSeries,
  postVisibilityFilter,
} from "./cms-d1-shared";
import { replaceD1PostTags } from "./cms-d1-tags";
import { getCmsDb } from "./cms-db";

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function listD1Posts({
  featured,
  includeUnpublished = false,
  includeUnlisted = false,
  limit,
  offset,
  query = "",
  seriesSlug,
  tagSlug,
}: ListPostsOptions = {}) {
  const normalizedLimit = normalizeListLimit(limit);
  const normalizedOffset = normalizeListOffset(offset);

  // Cache the common case: published posts, no search query
  if (
    !includeUnpublished &&
    !includeUnlisted &&
    featured === undefined &&
    !query &&
    !seriesSlug &&
    !tagSlug &&
    normalizedLimit === undefined &&
    normalizedOffset === 0
  ) {
    return cachedGet("posts:published", () =>
      listD1PostsFromDb({ includeUnpublished: false, includeUnlisted: false, query: "" }),
    );
  }

  return listD1PostsFromDb({
    includeUnpublished,
    includeUnlisted,
    featured,
    limit: normalizedLimit,
    offset: normalizedOffset,
    query,
    seriesSlug,
    tagSlug,
  });
}

export async function countD1Posts({
  featured,
  includeUnpublished = false,
  includeUnlisted = false,
  query = "",
  seriesSlug,
  tagSlug,
}: ListPostsOptions = {}) {
  const db = getCmsDb();
  const conditions = await buildD1PostConditions({
    includeUnpublished,
    includeUnlisted,
    featured,
    query,
    seriesSlug,
    tagSlug,
  });

  if (!conditions) {
    return 0;
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.posts)
    .where(and(...conditions));

  return Number(row?.count ?? 0);
}

async function listD1PostsFromDb({
  featured,
  includeUnpublished = false,
  includeUnlisted = false,
  limit,
  offset,
  query = "",
  seriesSlug,
  tagSlug,
}: ListPostsOptions = {}) {
  const db = getCmsDb();
  const normalizedLimit = normalizeListLimit(limit);
  const normalizedOffset = normalizeListOffset(offset);
  const conditions = await buildD1PostConditions({
    includeUnpublished,
    includeUnlisted,
    featured,
    query,
    seriesSlug,
    tagSlug,
  });

  if (!conditions) {
    return [];
  }

  const queryRows = () =>
    db
      .select()
      .from(schema.posts)
      .where(and(...conditions))
      .orderBy(
        desc(schema.posts.pinned),
        desc(schema.posts.publishedAt),
        desc(schema.posts.updatedAt),
      );
  const rows =
    normalizedLimit === undefined
      ? await queryRows()
      : await queryRows().limit(normalizedLimit).offset(normalizedOffset);

  const currentSettings = await getD1SiteSettings();

  return attachD1Relations(rows, currentSettings);
}

async function buildD1PostConditions({
  featured,
  includeUnpublished = false,
  includeUnlisted = false,
  query = "",
  seriesSlug,
  tagSlug,
}: ListPostsOptions = {}) {
  const db = getCmsDb();
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSeriesSlug = seriesSlug?.trim();
  const normalizedTagSlug = tagSlug?.trim();
  const conditions = [postVisibilityFilter(includeUnpublished)];

  // 公开列表（未显式包含未列出项）默认隐藏“不显示在博客列表”的文章，
  // 仅管理员在后台列表里通过 includeUnlisted 看到它们。
  if (!includeUnlisted) {
    conditions.push(eq(schema.posts.listed, true));
  }

  if (featured !== undefined) {
    conditions.push(eq(schema.posts.featured, featured));
  }

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    conditions.push(
      or(
        like(sql`lower(${schema.posts.title})`, pattern),
        like(sql`lower(${schema.posts.excerpt})`, pattern),
        like(sql`lower(${schema.posts.contentText})`, pattern),
        like(sql`lower(${schema.posts.slug})`, pattern),
      )!,
    );
  }

  if (normalizedSeriesSlug) {
    const [series] = await db
      .select({ id: schema.series.id })
      .from(schema.series)
      .where(eq(schema.series.slug, normalizedSeriesSlug))
      .limit(1);

    if (!series) {
      return null;
    }

    conditions.push(eq(schema.posts.seriesId, series.id));
  }

  if (normalizedTagSlug) {
    const [tag] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.slug, normalizedTagSlug))
      .limit(1);

    if (!tag) {
      return null;
    }

    const postTagRows = await db
      .select({ postId: schema.postTags.postId })
      .from(schema.postTags)
      .where(eq(schema.postTags.tagId, tag.id));
    const postIds = postTagRows.map((row) => row.postId);

    if (!postIds.length) {
      return null;
    }

    conditions.push(inArray(schema.posts.id, postIds));
  }

  return conditions;
}

function normalizeListLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || limit === undefined) {
    return undefined;
  }

  return Math.min(Math.max(1, Math.floor(limit)), 100);
}

function normalizeListOffset(offset: number | undefined) {
  if (!Number.isFinite(offset) || offset === undefined) {
    return 0;
  }

  return Math.max(0, Math.floor(offset));
}

export async function getD1PostBySlug(slug: string, includeUnpublished = false) {
  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(and(eq(schema.posts.slug, slug), postVisibilityFilter(includeUnpublished)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const [post] = await attachD1Relations([row], await getD1SiteSettings());

  return post;
}

export async function getD1PostByIdOrSlug(idOrSlug: string, includeUnpublished = true) {
  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(
      and(
        or(eq(schema.posts.id, idOrSlug), eq(schema.posts.slug, idOrSlug)),
        postVisibilityFilter(includeUnpublished),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const [post] = await attachD1Relations([row], await getD1SiteSettings());

  return post;
}

export async function createD1Post(input: PostInput) {
  const currentSettings = await getD1SiteSettings();
  const title = input.title?.trim() || "Untitled post";
  const slugBase = input.slug?.trim() ? slugify(input.slug.trim()) : generateRandomSlug(16);
  const slug = await uniqueD1Slug(slugBase);
  const now = new Date().toISOString();
  const contentMarkdown = input.contentMarkdown?.trim() || `# ${title}\n`;
  const contentHtml = input.contentHtml
    ? sanitizeHtml(input.contentHtml)
    : renderMarkdownToHtml(contentMarkdown);
  const contentText = input.contentHtml ? htmlToText(contentHtml) : markdownToText(contentMarkdown);
  const status = input.status ?? "draft";
  const source = input.source ?? "api";
  const publishedAt = normalizeDateInput(input.publishedAt) ?? now;
  const coverImage = input.coverImage?.trim() ?? "";
  const seriesId = (await resolveD1SeriesId(input)) ?? null;
  const post: Post = {
    id: `post_${crypto.randomUUID()}`,
    title,
    slug,
    excerpt: input.excerpt?.trim() || contentText.slice(0, MAX_EXCERPT_LENGTH),
    coverImage,
    contentMarkdown,
    contentHtml,
    contentText,
    status,
    source,
    featured: input.featured ?? false,
    pinned: input.pinned ?? false,
    listed: input.listed ?? true,
    commentsEnabled: input.commentsEnabled ?? true,
    publishedAt,
    updatedAt: now,
    authorName: currentSettings.authorName,
    series: null,
    tags: [],
    seoTitle: input.seoTitle?.trim() || title,
    seoDescription:
      input.seoDescription?.trim() ||
      input.excerpt?.trim() ||
      contentText.slice(0, MAX_SEO_DESCRIPTION_LENGTH),
    i18n: input.i18n,
  };

  if (input.locale === "zh") {
    post.i18n = {
      ...post.i18n,
      title: { ...post.i18n?.title, zh: title },
      excerpt: { ...post.i18n?.excerpt, zh: post.excerpt },
      contentMarkdown: { ...post.i18n?.contentMarkdown, zh: post.contentMarkdown },
      contentHtml: { ...post.i18n?.contentHtml, zh: post.contentHtml },
      contentText: { ...post.i18n?.contentText, zh: post.contentText },
      seoTitle: { ...post.i18n?.seoTitle, zh: post.seoTitle },
      seoDescription: { ...post.i18n?.seoDescription, zh: post.seoDescription },
    };
  }

  const db = getCmsDb();
  await db.insert(schema.posts).values({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: coverImage,
    contentMarkdown: post.contentMarkdown,
    contentHtml: post.contentHtml,
    contentText: post.contentText,
    status: post.status,
    source: post.source,
    featured: post.featured,
    pinned: post.pinned,
    listed: post.listed,
    commentsEnabled: post.commentsEnabled,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    i18n: post.i18n ?? null,
    publishedAt,
    createdAt: now,
    updatedAt: post.updatedAt,
    seriesId,
  });

  await replaceD1PostTags(post.id, input.tags ?? [], input.locale);
  await invalidateCache("posts:published", "tags:all", "sitemap:paths");

  return (await getD1PostByIdOrSlug(post.id)) ?? post;
}

export async function updateD1Post(idOrSlug: string, input: PostInput) {
  const post = await getD1PostByIdOrSlug(idOrSlug);

  if (!post) {
    return undefined;
  }

  const localizedUpdate = input.locale === "zh";
  const inputTitle = input.title?.trim();
  const inputExcerpt = input.excerpt?.trim();
  const inputMarkdown = input.contentMarkdown?.trim();
  const inputHtml = input.contentHtml !== undefined ? sanitizeHtml(input.contentHtml) : undefined;
  const title = localizedUpdate ? post.title : inputTitle || post.title;
  const contentMarkdown = localizedUpdate
    ? post.contentMarkdown
    : (inputMarkdown ?? post.contentMarkdown);
  const contentHtml = localizedUpdate
    ? post.contentHtml
    : inputHtml !== undefined
      ? inputHtml
      : inputMarkdown !== undefined
        ? renderMarkdownToHtml(contentMarkdown)
        : post.contentHtml;
  const contentText = localizedUpdate
    ? post.contentText
    : inputHtml !== undefined
      ? htmlToText(contentHtml)
      : inputMarkdown !== undefined
        ? markdownToText(contentMarkdown)
        : post.contentText;
  const status = input.status ?? post.status;
  const slug =
    !localizedUpdate && input.slug && input.slug.trim()
      ? await uniqueD1Slug(slugify(input.slug.trim()), post.id)
      : post.slug;
  const now = new Date().toISOString();
  const inputPublishedAt =
    input.publishedAt !== undefined ? normalizeDateInput(input.publishedAt) : undefined;
  const publishedAt =
    inputPublishedAt ??
    (status === "published" && post.status !== "published" ? now : post.publishedAt);
  const i18n = buildPostI18n(post, input, {
    contentHtml: inputHtml,
    contentMarkdown: inputMarkdown,
    excerpt: inputExcerpt,
    title: inputTitle,
  });
  const excerpt = localizedUpdate
    ? post.excerpt
    : inputExcerpt !== undefined
      ? inputExcerpt
      : post.excerpt;
  const seoTitle = localizedUpdate ? post.seoTitle : input.seoTitle?.trim() || title;
  const seoDescription = localizedUpdate
    ? post.seoDescription
    : input.seoDescription !== undefined
      ? input.seoDescription.trim()
      : input.excerpt !== undefined
        ? excerpt
        : post.seoDescription;
  const commentsEnabled = input.commentsEnabled ?? post.commentsEnabled;
  const featured = input.featured ?? post.featured;
  const pinned = input.pinned ?? post.pinned;
  const listed = input.listed ?? post.listed;
  const nextSeriesId = await resolveD1SeriesId(input);

  const db = getCmsDb();
  await db
    .update(schema.posts)
    .set({
      title,
      slug,
      excerpt,
      coverImage: input.coverImage !== undefined ? input.coverImage.trim() : post.coverImage,
      contentMarkdown,
      contentHtml,
      contentText,
      status,
      featured,
      pinned,
      listed,
      commentsEnabled,
      seoTitle,
      seoDescription,
      i18n: i18n ?? null,
      publishedAt,
      updatedAt: now,
      ...(hasSeriesInput(input) ? { seriesId: nextSeriesId ?? null } : {}),
    })
    .where(eq(schema.posts.id, post.id));

  if (input.tags !== undefined) {
    await replaceD1PostTags(post.id, input.tags, input.locale);
  }

  await invalidateCache("posts:published", "tags:all", "sitemap:paths");

  return getD1PostByIdOrSlug(post.id);
}

function buildPostI18n(
  post: Post,
  input: PostInput,
  normalized: {
    contentHtml?: string;
    contentMarkdown?: string;
    excerpt?: string;
    title?: string;
  },
) {
  if (input.i18n) {
    return input.i18n;
  }

  const next = { ...post.i18n };

  // 正文随每次保存同步到 zh 本地化副本：否则编辑器保存（不带 locale=zh）只更新主字段，
  // zh 页面会一直渲染陈旧的 i18n.zh.contentHtml，导致新增的视频等媒体无法显示。
  if (normalized.contentMarkdown !== undefined) {
    const html = normalized.contentHtml ?? renderMarkdownToHtml(normalized.contentMarkdown);
    const text =
      normalized.contentHtml !== undefined
        ? htmlToText(normalized.contentHtml)
        : markdownToText(normalized.contentMarkdown);
    next.contentMarkdown = { ...next.contentMarkdown, zh: normalized.contentMarkdown };
    next.contentHtml = { ...next.contentHtml, zh: html };
    next.contentText = { ...next.contentText, zh: text };
  }

  if (input.locale === "zh") {
    const setZh = <TField extends keyof NonNullable<Post["i18n"]>>(
      field: TField,
      value?: string,
    ) => {
      if (value === undefined) {
        return;
      }

      next[field] = {
        ...next[field],
        zh: value,
      };
    };

    setZh("title", normalized.title);
    setZh("excerpt", normalized.excerpt);
    setZh("seoTitle", input.seoTitle?.trim() || normalized.title);
    setZh(
      "seoDescription",
      input.seoDescription?.trim() || normalized.excerpt || next.contentText?.zh,
    );
  }

  return next;
}

export async function deleteD1Post(idOrSlug: string) {
  const post = await getD1PostByIdOrSlug(idOrSlug);

  if (!post) {
    return undefined;
  }

  const now = new Date().toISOString();
  const db = getCmsDb();

  await db
    .update(schema.posts)
    .set({ status: "deleted", updatedAt: now })
    .where(eq(schema.posts.id, post.id));

  await invalidateCache("posts:published", "sitemap:paths");

  return {
    ...post,
    status: "deleted" as const,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Relation attachment (private helper for posts)
// ---------------------------------------------------------------------------

async function attachD1Relations(
  rows: Array<typeof schema.posts.$inferSelect>,
  currentSettings: Awaited<ReturnType<typeof getD1SiteSettings>>,
) {
  if (!rows.length) {
    return [];
  }

  const db = getCmsDb();
  const posts = rows.map((row) => drizzleRowToPost(row, currentSettings));
  const postIds = posts.map((post) => post.id);
  const seriesIds = Array.from(
    new Set(rows.map((row) => row.seriesId).filter((id): id is string => Boolean(id))),
  );
  const [tagRows, seriesRows, sourceRows] = await Promise.all([
    db
      .select({
        tagId: schema.tags.id,
        tagName: schema.tags.name,
        tagSlug: schema.tags.slug,
        tagDescription: schema.tags.description,
        tagI18n: schema.tags.i18n,
        postId: schema.postTags.postId,
      })
      .from(schema.tags)
      .innerJoin(schema.postTags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, postIds))
      .orderBy(asc(schema.tags.name)),
    seriesIds.length
      ? db.select().from(schema.series).where(inArray(schema.series.id, seriesIds))
      : Promise.resolve([]),
    db.select().from(schema.postSources).where(inArray(schema.postSources.postId, postIds)),
  ]);

  const seriesById = new Map(seriesRows.map((row) => [row.id, drizzleRowToSeries(row)]));
  const sourcesByPostId = new Map(
    sourceRows.map((row) => [row.postId, drizzleRowToPostExternalSource(row)]),
  );
  const tagsByPostId = new Map<string, Tag[]>();

  for (const row of tagRows) {
    const tag: Tag = {
      id: row.tagId,
      name: row.tagName,
      slug: row.tagSlug,
      description: row.tagDescription,
      i18n: row.tagI18n as Tag["i18n"],
    };
    const current = tagsByPostId.get(row.postId) ?? [];
    current.push(tag);
    tagsByPostId.set(row.postId, current);
  }

  return posts.map((post, index) => ({
    ...post,
    externalSource: sourcesByPostId.get(post.id) ?? null,
    series: rows[index].seriesId ? (seriesById.get(rows[index].seriesId) ?? null) : null,
    tags: tagsByPostId.get(post.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Slug uniqueness
// ---------------------------------------------------------------------------

async function uniqueD1Slug(base: string, currentPostId?: string) {
  const normalized = base || "untitled-post";
  let candidate = normalized;
  let index = 2;

  while (true) {
    const existing = await getD1PostBySlug(candidate, true);

    if (!existing || existing.id === currentPostId) {
      return candidate;
    }

    candidate = `${normalized}-${index}`;
    index += 1;
  }
}

const RANDOM_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// 生成 URL 安全的随机链接（默认 16 位）。文章名是汉字时，留空别名就用它当链接，
// 避免把中文塞进 URL。
export function generateRandomSlug(length = 16): string {
  const bytes = new Uint8Array(length);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let out = "";

  for (let i = 0; i < length; i += 1) {
    out += RANDOM_SLUG_ALPHABET[bytes[i] % RANDOM_SLUG_ALPHABET.length];
  }

  return out;
}
