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

import { cachedGet, invalidateCache } from "./cms-cache";
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

export async function getD1SiteSettings(locale?: SupportedLocale) {
  const settings = await cachedGet("site:settings", () =>
    readD1SiteSettings().catch(() => runtimeDefaultSiteSettings()),
  );

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
  const current = await getD1SiteSettings();
  const settings = normalizeSiteSettings(input, current);
  const now = new Date().toISOString();

  const db = getCmsDb();
  await db
    .insert(schema.siteSettings)
    .values({ key: siteSettingsKey, value: settings, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: settings, updatedAt: now },
    });

  await invalidateCache("site:settings", "sitemap:paths");

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
