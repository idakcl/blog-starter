import "@tanstack/react-start/server-only";
import {
  localizeSiteSettings,
  localizeSeries,
  localizeTag,
  type ApiTokenScope,
  type Asset,
  type SupportedLocale,
  digestText,
  parseJson,
} from "@repo/core";
import * as schema from "@repo/db/schema/cms";
import { eq, and, or, desc, sql } from "drizzle-orm";

import { invalidateCache } from "./cms-cache";
import {
  type AssetInput,
  type SiteSettingsInput,
  drizzleRowToAsset,
  drizzleRowToApiToken,
  normalizeSiteSettings,
  runtimeDefaultSiteSettings,
} from "./cms-d1-shared";
import { getCmsDb } from "./cms-db";

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

const siteSettingsKey = "site";

/**
 * 返回站点设置的版本戳（即 DB 行的 updatedAt）。
 * 用于给公开 HTML 的边缘缓存键加版本，设置变更后能立刻让旧缓存失效，
 * 否则保存站点名称等设置后要等边缘缓存（s-maxage=300）过期才生效。
 */
export async function getSiteSettingsCacheVersion(): Promise<string> {
  // 每次直接读 D1 的 updatedAt，不使用 KV 缓存。该版本戳用于给公开 HTML
  // 的边缘缓存键加戳；若走 Cloudflare KV 缓存，其最终一致性会让「删除旧版本」
  // 在边缘迟迟不生效，导致保存设置后前台长时间（甚至 5 分钟以上）显示旧值。
  try {
    const db = getCmsDb();
    const rows = await db
      .select({ updatedAt: schema.siteSettings.updatedAt })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, siteSettingsKey))
      .limit(1);
    return rows[0]?.updatedAt ?? "v0";
  } catch {
    return "v0";
  }
}

export async function getD1SiteSettings(locale?: SupportedLocale) {
  // 直接读 D1（强一致），不经 KV 缓存。站点设置保存后必须立即对所有页面
  // 生效；Cloudflare KV 的最终一致性会让旧值在边缘残留，造成「保存了但没变化」。
  const settings = await readD1SiteSettings().catch(() => runtimeDefaultSiteSettings());

  return locale ? localizeSiteSettings(settings, locale) : settings;
}

async function readD1SiteSettings() {
  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.key, siteSettingsKey))
    .limit(1);
  const row = rows[0];

  return normalizeSiteSettings(parseStoredSiteSettings(row?.value));
}

export async function updateD1SiteSettings(input: SiteSettingsInput) {
  // 直接读 D1 取当前值（不经 KV 缓存，避免读回被缓存的旧值）。
  const current = await readD1SiteSettings();
  const settings = normalizeSiteSettings(input, current);

  // 简单设置表单只编辑「规范值」（name/description/authorBio 等），并不管理
  // 逐语言翻译。若保留旧的 i18n 覆盖（例如初始化时写入的 i18n.name.en="My Blog"），
  // 经 localizeSiteSettings 后会在任何语言下都优先显示该旧值，导致「保存成功但
  // 刷新后名称恢复成 My Blog」的假象。保存时清掉这些过期的逐语言覆盖，使本地化
  // 回退到规范值。
  settings.i18n = {};

  const now = new Date().toISOString();

  const db = getCmsDb();
  await db
    .insert(schema.siteSettings)
    .values({ key: siteSettingsKey, value: settings, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: settings, updatedAt: now },
    });

  // 站点设置与版本戳已改为每次直读 D1，无需再清 KV；仅需清 sitemap 缓存。
  await invalidateCache("sitemap:paths");

  return settings;
}

function parseStoredSiteSettings(value: unknown): SiteSettingsInput {
  if (typeof value === "string") {
    return parseJson<SiteSettingsInput>(value) ?? {};
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as SiteSettingsInput;
  }

  return {};
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export async function listD1Assets() {
  const db = getCmsDb();
  const rows = await db.select().from(schema.assets).orderBy(desc(schema.assets.createdAt));

  return rows.map(drizzleRowToAsset);
}

export async function getD1AssetById(idOrKey: string) {
  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.assets)
    .where(or(eq(schema.assets.id, idOrKey), eq(schema.assets.key, idOrKey)))
    .limit(1);

  return rows[0] ? drizzleRowToAsset(rows[0]) : undefined;
}

export async function createD1Asset(input: AssetInput) {
  const asset: Asset = {
    id: `asset_${crypto.randomUUID()}`,
    key: input.key,
    url: input.url,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    attachedPostId: input.attachedPostId ?? null,
    createdAt: new Date().toISOString(),
  };

  const db = getCmsDb();
  await db.insert(schema.assets).values({
    id: asset.id,
    key: asset.key,
    url: asset.url,
    filename: asset.filename,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    attachedPostId: asset.attachedPostId,
    createdAt: asset.createdAt,
  });

  return asset;
}

export async function deleteD1Asset(idOrKey: string) {
  const asset = await getD1AssetById(idOrKey);

  if (!asset) {
    return undefined;
  }

  const db = getCmsDb();
  await db.delete(schema.assets).where(eq(schema.assets.id, asset.id));

  return asset;
}

// ---------------------------------------------------------------------------
// API tokens
// ---------------------------------------------------------------------------

export async function createD1ApiToken(input: {
  name?: string;
  scopes?: ApiTokenScope[];
  expiresAt?: string | null;
}) {
  const secret = `blogcms_${crypto.randomUUID().replace(/-/g, "")}`;
  const token = {
    id: `token_${crypto.randomUUID()}`,
    name: input.name?.trim() || "Automation token",
    tokenPrefix: secret.slice(0, 16),
    scopes: input.scopes?.length ? input.scopes : ["posts:read", "posts:write"],
    expiresAt: input.expiresAt ?? null,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date().toISOString(),
  };

  const db = getCmsDb();
  await db.insert(schema.apiTokens).values({
    id: token.id,
    name: token.name,
    tokenHash: await digestText(secret),
    scopes: token.scopes,
    expiresAt: token.expiresAt,
    lastUsedAt: token.lastUsedAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt,
  });

  return { token, secret };
}

export async function listD1ApiTokens() {
  const db = getCmsDb();
  const rows = await db.select().from(schema.apiTokens).orderBy(desc(schema.apiTokens.createdAt));

  return rows.map(drizzleRowToApiToken);
}

export async function revokeD1ApiToken(id: string) {
  const db = getCmsDb();

  await db
    .update(schema.apiTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(schema.apiTokens.id, id), sql`${schema.apiTokens.revokedAt} is null`));

  const rows = await db.select().from(schema.apiTokens).where(eq(schema.apiTokens.id, id)).limit(1);

  return rows[0] ? drizzleRowToApiToken(rows[0]) : undefined;
}

export async function verifyD1ApiToken(secret: string, requiredScope: ApiTokenScope) {
  const db = getCmsDb();
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(schema.apiTokens)
    .where(
      and(
        eq(schema.apiTokens.tokenHash, await digestText(secret)),
        sql`${schema.apiTokens.revokedAt} is null`,
        or(sql`${schema.apiTokens.expiresAt} is null`, sql`${schema.apiTokens.expiresAt} > ${now}`),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  const token = drizzleRowToApiToken(row);

  if (!token.scopes.includes(requiredScope)) {
    return null;
  }

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: now })
    .where(eq(schema.apiTokens.id, token.id));

  return token;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

import { listD1Comments } from "./cms-d1-comments";
import { listD1Posts } from "./cms-d1-posts";
import { listD1Series } from "./cms-d1-series";
import { listD1Tags } from "./cms-d1-tags";

export async function buildD1SiteExport(locale: SupportedLocale) {
  const [persistedPosts, persistedComments, persistedAssets, persistedTags, persistedSeries] =
    await Promise.all([
      listD1Posts({ includeUnpublished: true }),
      listD1Comments(),
      listD1Assets(),
      listD1Tags(),
      listD1Series(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    locale,
    site: await getD1SiteSettings(locale),
    posts: persistedPosts.map((post) => ({
      ...post,
      comments: persistedComments.filter((comment) => comment.postId === post.id),
    })),
    series: persistedSeries.map((series) => localizeSeries(series, locale)),
    tags: persistedTags.map((tag) => localizeTag(tag, locale)),
    assets: persistedAssets,
    comments: persistedComments,
  };
}
