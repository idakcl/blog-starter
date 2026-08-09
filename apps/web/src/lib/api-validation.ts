import type { ApiTokenScope, EmailPreference } from "@repo/core";
import { z } from "zod";

import { isEmailPreference } from "./email-preferences";

const ContentStatusSchema = z.enum(["draft", "published", "scheduled", "archived", "deleted"]);
const ContentSourceSchema = z.enum([
  "editor",
  "markdown_upload",
  "html_upload",
  "api",
  "cli",
  "ai",
  "import",
]);
const SupportedLocaleSchema = z.enum(["en", "zh"]);
const EmailPreferenceSchema = z.custom<EmailPreference>(isEmailPreference);
const ApiTokenScopeSchema = z.enum([
  "posts:read",
  "posts:write",
  "posts:publish",
  "assets:write",
  "comments:moderate",
  "site:read",
  "site:write",
  "export:read",
] satisfies [ApiTokenScope, ...ApiTokenScope[]]);
const TrimmedRequiredStringSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string(),
);
const OptionalTrimmedStringSchema = z.preprocess((value) => {
  if (value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().optional());
const OptionalNullableTrimmedStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed || null;
}, z.string().nullable().optional());
const LocalizedStringSchema = z
  .object({
    en: z.string().optional(),
    zh: z.string().optional(),
  })
  .strict();
const PostI18nSchema = z
  .object({
    title: LocalizedStringSchema.optional(),
    excerpt: LocalizedStringSchema.optional(),
    contentMarkdown: LocalizedStringSchema.optional(),
    contentHtml: LocalizedStringSchema.optional(),
    contentText: LocalizedStringSchema.optional(),
    seoTitle: LocalizedStringSchema.optional(),
    seoDescription: LocalizedStringSchema.optional(),
  })
  .strict();

/**
 * Schema for POST /api/comments — comment creation body.
 *
 * Fields read from the request body in the comments route:
 *   postSlug, body, parentId, honeypot, turnstileToken
 *
 * `authorName` and `authorEmail` are resolved server-side from the
 * authenticated session, so they are not part of this input schema.
 */
export const CreateCommentSchema = z.object({
  postSlug: TrimmedRequiredStringSchema.pipe(z.string().min(1).max(200)),
  body: z
    .string()
    .min(2)
    .max(4000)
    .refine((value) => value.trim().length >= 2, {
      message: "Comment body must contain at least 2 non-whitespace characters",
    }),
  parentId: OptionalNullableTrimmedStringSchema,
  guestName: z.string().min(1).max(60).optional(),
  honeypot: z.string().optional().default(""),
  turnstileToken: OptionalTrimmedStringSchema,
});

export const PostWriteSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    coverImage: z.string().optional(),
    contentMarkdown: z.string().optional(),
    contentHtml: z.string().optional(),
    status: ContentStatusSchema.optional(),
    source: ContentSourceSchema.optional(),
    featured: z.boolean().optional(),
    pinned: z.boolean().optional(),
    commentsEnabled: z.boolean().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    tags: z.array(z.string()).optional(),
    seriesId: z.string().nullable().optional(),
    seriesSlug: z.string().nullable().optional(),
    seriesName: z.string().nullable().optional(),
    publishedAt: z.string().optional(),
    locale: SupportedLocaleSchema.optional(),
    i18n: PostI18nSchema.optional(),
  })
  .strict();

export const PostPatchSchema = PostWriteSchema.refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one post field to update.",
});

export const BatchPostSchema = z
  .object({
    ids: z
      .array(TrimmedRequiredStringSchema.pipe(z.string().min(1)))
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Post ids must be unique.",
      }),
    action: z.enum(["publish", "draft", "archive", "delete"]),
    locale: SupportedLocaleSchema.optional(),
  })
  .strict();

export const AccountEmailPreferencesPatchSchema = z
  .object({
    emailPreference: EmailPreferenceSchema.optional(),
    marketingOptOut: z.boolean().optional(),
    commentReplyNotificationsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one email preference field.",
  });

export const ApiTokenCreateSchema = z
  .object({
    name: TrimmedRequiredStringSchema.pipe(z.string().min(1).max(120)),
    scopes: z
      .array(ApiTokenScopeSchema)
      .min(1)
      .max(8)
      .refine((scopes) => new Set(scopes).size === scopes.length, {
        message: "API token scopes must be unique.",
      }),
    expiresAt: z
      .preprocess(
        (value) => (value === "" ? null : value),
        z.iso.datetime({ offset: true }).nullable().optional(),
      )
      .refine(
        (value) => !value || (Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now()),
        {
          message: "API token expiry must be a future ISO datetime.",
        },
      ),
  })
  .strict();

/**
 * Run a zod parse and return either the validated data or a 400 Response.
 * Returns `[data, null]` on success or `[null, errorResponse]` on failure.
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
): [z.infer<T>, null] | [null, Response] {
  const result = schema.safeParse(data);

  if (result.success) {
    return [result.data, null];
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return [null, Response.json({ error: "Validation failed", details: errors }, { status: 400 })];
}
