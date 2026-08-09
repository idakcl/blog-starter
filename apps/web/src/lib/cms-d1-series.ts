import "@tanstack/react-start/server-only";
import { type Series, type SupportedLocale, slugify } from "@repo/core";
import * as schema from "@repo/db/schema/cms";
import { asc, eq, or } from "drizzle-orm";

import { cachedGet, invalidateCache } from "./cms-cache";
import { drizzleRowToSeries, type PostInput } from "./cms-d1-shared";
import { getCmsDb } from "./cms-db";

type SeriesInput = Partial<{
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  locale: SupportedLocale;
}>;

export async function listD1Series() {
  return cachedGet("series:all", async () => {
    const db = getCmsDb();
    const rows = await db
      .select()
      .from(schema.series)
      .orderBy(asc(schema.series.sortOrder), asc(schema.series.name));

    return rows.map(drizzleRowToSeries);
  });
}

export async function getD1SeriesByIdOrSlug(idOrSlug: string) {
  const normalized = idOrSlug.trim();

  if (!normalized) {
    return undefined;
  }

  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.series)
    .where(or(eq(schema.series.id, normalized), eq(schema.series.slug, normalized)))
    .limit(1);
  const row = rows[0];

  return row ? drizzleRowToSeries(row) : undefined;
}

export async function createD1Series(input: SeriesInput) {
  const name = input.name?.trim();

  if (!name) {
    return undefined;
  }

  const now = new Date().toISOString();
  const seriesSlug = await uniqueD1SeriesSlug(slugify(input.slug?.trim() || name));
  const description = input.description?.trim() ?? "";
  const series: Series = {
    id: `series_${crypto.randomUUID()}`,
    name,
    slug: seriesSlug,
    description,
    sortOrder: input.sortOrder ?? 0,
    i18n:
      input.locale === "zh"
        ? {
            name: { zh: name },
            description: { zh: description },
          }
        : undefined,
  };

  const db = getCmsDb();
  await db.insert(schema.series).values({
    id: series.id,
    name: series.name,
    slug: series.slug,
    description: series.description,
    sortOrder: series.sortOrder,
    i18n: series.i18n ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await invalidateCache("series:all", "posts:published", "sitemap:paths");

  return series;
}

export async function updateD1Series(idOrSlug: string, input: SeriesInput) {
  const existing = await getD1SeriesByIdOrSlug(idOrSlug);

  if (!existing) {
    return undefined;
  }

  const name = input.name?.trim() || existing.name;
  const description =
    input.description !== undefined ? input.description.trim() : existing.description;
  const slug =
    input.slug !== undefined && input.slug.trim() !== existing.slug
      ? await uniqueD1SeriesSlug(slugify(input.slug.trim() || name), existing.id)
      : existing.slug;
  const i18n =
    input.locale === "zh"
      ? {
          ...existing.i18n,
          name: { ...existing.i18n?.name, zh: name },
          description: { ...existing.i18n?.description, zh: description },
        }
      : existing.i18n;
  const db = getCmsDb();

  await db
    .update(schema.series)
    .set({
      name,
      slug,
      description,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      i18n: i18n ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.series.id, existing.id));

  await invalidateCache("series:all", "posts:published", "sitemap:paths");

  return getD1SeriesByIdOrSlug(existing.id);
}

export async function deleteD1Series(idOrSlug: string) {
  const existing = await getD1SeriesByIdOrSlug(idOrSlug);

  if (!existing) {
    return undefined;
  }

  const db = getCmsDb();
  await db
    .update(schema.posts)
    .set({ seriesId: null })
    .where(eq(schema.posts.seriesId, existing.id));
  await db.delete(schema.series).where(eq(schema.series.id, existing.id));
  await invalidateCache("series:all", "posts:published", "sitemap:paths");

  return existing;
}

export async function resolveD1SeriesId(input: PostInput) {
  if (!hasSeriesInput(input)) {
    return undefined;
  }

  if (input.seriesId === null || input.seriesId === "") {
    return null;
  }

  if (input.seriesId) {
    return (await getD1SeriesByIdOrSlug(input.seriesId))?.id ?? null;
  }

  if (input.seriesSlug) {
    return (await getD1SeriesByIdOrSlug(input.seriesSlug))?.id ?? null;
  }

  if (input.seriesName?.trim()) {
    return (await upsertD1Series(input.seriesName, input.locale))?.id ?? null;
  }

  return null;
}

export function hasSeriesInput(input: PostInput) {
  return "seriesId" in input || "seriesSlug" in input || "seriesName" in input;
}

async function upsertD1Series(name: string, locale?: SupportedLocale) {
  const seriesSlug = slugify(name);

  if (!seriesSlug) {
    return undefined;
  }

  const existing = await getD1SeriesByIdOrSlug(seriesSlug);

  if (existing) {
    if (locale === "zh") {
      return updateD1Series(existing.id, { name, locale });
    }

    return existing;
  }

  return createD1Series({ name, locale });
}

async function uniqueD1SeriesSlug(base: string, ignoreId?: string) {
  const normalized = base || "series";
  let candidate = normalized;
  let index = 2;

  while (true) {
    const existing = await getD1SeriesByIdOrSlug(candidate);

    if (!existing || existing.id === ignoreId) {
      return candidate;
    }

    candidate = `${normalized}-${index}`;
    index += 1;
  }
}
