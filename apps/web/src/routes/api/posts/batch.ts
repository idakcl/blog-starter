import { localizePost, type ContentStatus, type Post } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { BatchPostSchema, validateBody } from "#/lib/api-validation";
import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { getD1PostByIdOrSlug, updateD1Post } from "#/lib/cms-d1";

const batchStatusByAction = {
  publish: "published",
  draft: "draft",
  archive: "archived",
  delete: "deleted",
} satisfies Record<string, ContentStatus>;

export const Route = createFileRoute("/api/posts/batch")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const rawBody = await readJsonBody<Record<string, unknown>>(request);
        const [body, validationError] = validateBody(BatchPostSchema, rawBody);

        if (validationError) {
          return validationError;
        }

        if (body.action === "publish") {
          const publishError = await requireCmsAccess(request, "posts:publish");

          if (publishError) {
            return publishError;
          }
        }

        const status = batchStatusByAction[body.action];
        const locale = getApiLocale(request);
        const updatedPosts: Post[] = [];

        for (const id of body.ids) {
          const post = await getD1PostByIdOrSlug(id);

          if (!post) {
            continue;
          }

          if (post.externalSource?.kind === "obsidian_git") {
            continue;
          }

          const updated = await updateD1Post(post.id, { status, locale });

          if (updated) {
            updatedPosts.push(localizePost(updated, locale));
          }
        }

        return jsonResponse({
          data: updatedPosts,
          action: body.action,
          requiredScope: "posts:write",
        });
      },
    },
  },
});
