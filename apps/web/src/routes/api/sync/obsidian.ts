import { localizePost } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { syncD1ObsidianPosts } from "#/lib/cms-d1";

const SyncPostSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    coverImage: z.string().optional(),
    contentMarkdown: z.string().min(1),
    status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
    commentsEnabled: z.boolean().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    tags: z.array(z.string()).optional(),
    publishedAt: z.string().optional(),
    locale: z.enum(["en", "zh"]).optional(),
  })
  .strict();

const SyncBodySchema = z
  .object({
    deleteMissing: z.boolean().optional(),
    entries: z
      .array(
        z
          .object({
            path: z.string().min(1),
            hash: z.string().min(8),
            post: SyncPostSchema,
          })
          .strict(),
      )
      .max(500),
  })
  .strict();

export const Route = createFileRoute("/api/sync/obsidian")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const writeError = await requireCmsAccess(request, "posts:write");

        if (writeError) {
          return writeError;
        }

        const publishError = await requireCmsAccess(request, "posts:publish");

        if (publishError) {
          return publishError;
        }

        const body = await readJsonBody<Record<string, unknown>>(request);
        const result = SyncBodySchema.safeParse(body);

        if (!result.success) {
          return jsonResponse(
            {
              error: "Validation failed",
              details: result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
            { status: 400 },
          );
        }

        const locale = getApiLocale(request);
        const syncResult = await syncD1ObsidianPosts(result.data.entries, {
          deleteMissing: result.data.deleteMissing,
        });

        return jsonResponse({
          data: {
            ...syncResult,
            posts: syncResult.posts.map((post) => localizePost(post, locale)),
          },
          requiredScope: "posts:write",
        });
      },
    },
  },
});
