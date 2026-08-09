import { localizePost, resolveLocale } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { PostWriteSchema, validateBody } from "#/lib/api-validation";
import { createPostPreview, getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { createD1Post, listD1Posts } from "#/lib/cms-d1";
import { applyPublishingAutomation } from "#/lib/content-automation.server";

export const Route = createFileRoute("/api/posts")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const locale = getApiLocale(request);
        const url = new URL(request.url);
        const includeUnpublished = url.searchParams.get("status") === "all";

        if (includeUnpublished) {
          const accessError = await requireCmsAccess(request, "posts:read");

          if (accessError) {
            return accessError;
          }
        }

        const query = url.searchParams.get("q") ?? "";
        const tagSlug = url.searchParams.get("tag") ?? undefined;
        const seriesSlug = url.searchParams.get("series") ?? undefined;
        const posts = await listD1Posts({ includeUnpublished, query, seriesSlug, tagSlug });

        return jsonResponse({
          data: posts.map((post) => localizePost(post, locale)),
          locale,
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const rawBody = await readJsonBody<Parameters<typeof createPostPreview>[0]>(request);
        const [body, validationError] = validateBody(PostWriteSchema, rawBody);

        if (validationError) {
          return validationError;
        }

        if (body.status === "published" || body.status === "scheduled") {
          const publishError = await requireCmsAccess(request, "posts:publish");

          if (publishError) {
            return publishError;
          }
        }

        const locale = resolveLocale(body.locale);
        const postInput = await applyPublishingAutomation({
          ...body,
          locale,
        });
        const post = await createD1Post(postInput);

        return jsonResponse(
          {
            data: {
              ...post,
              url: `${new URL(request.url).origin}/blog/${post.slug}`,
            },
            requiredScope: "posts:write",
          },
          { status: 201 },
        );
      },
    },
  },
});
