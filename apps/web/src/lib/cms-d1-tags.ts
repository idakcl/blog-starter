import "@tanstack/react-start/server-only";
import { type SupportedLocale, type Tag, slugify } from "@repo/core";
import * as schema from "@repo/db/schema/cms";
import { eq, asc } from "drizzle-orm";

import { cachedGet } from "./cms-cache";
import { drizzleRowToTag } from "./cms-d1-shared";
import { getCmsDb } from "./cms-db";

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function listD1Tags() {
  return cachedGet("tags:all", async () => {
    const db = getCmsDb();
    const rows = await db.select().from(schema.tags).orderBy(asc(schema.tags.name));
    return rows.map(drizzleRowToTag);
  });
}

export async function upsertD1Tag(name: string, locale?: SupportedLocale) {
  const tagSlug = slugify(name);

  if (!tagSlug) {
    return undefined;
  }

  const db = getCmsDb();
  const rows = await db.select().from(schema.tags).where(eq(schema.tags.slug, tagSlug)).limit(1);
  const existing = rows[0];

  if (existing) {
    if (locale === "zh") {
      const existingI18n = existing.i18n as Tag["i18n"];
      const i18n = {
        ...existingI18n,
        name: {
          ...existingI18n?.name,
          zh: name,
        },
      };

      await db.update(schema.tags).set({ i18n }).where(eq(schema.tags.id, existing.id));

      return {
        ...drizzleRowToTag(existing),
        i18n,
      };
    }

    return drizzleRowToTag(existing);
  }

  const now = new Date().toISOString();
  const tag: Tag = {
    id: `tag_${crypto.randomUUID()}`,
    name,
    slug: tagSlug,
    description: "",
    i18n:
      locale === "zh"
        ? {
            name: { zh: name },
          }
        : undefined,
  };

  await db.insert(schema.tags).values({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    i18n: tag.i18n ?? null,
    createdAt: now,
  });

  return tag;
}

export async function replaceD1PostTags(
  postId: string,
  input: string[] | undefined,
  locale?: SupportedLocale,
) {
  const db = getCmsDb();
  await db.delete(schema.postTags).where(eq(schema.postTags.postId, postId));

  const names = Array.from(new Set((input ?? []).map((name) => name.trim()).filter(Boolean)));

  for (const name of names) {
    const tag = await upsertD1Tag(name, locale);

    if (!tag) {
      continue;
    }

    await db.insert(schema.postTags).values({ postId, tagId: tag.id }).onConflictDoNothing();
  }
}
