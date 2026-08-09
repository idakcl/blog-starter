import { localizePost } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { PostPatchSchema, validateBody } from "#/lib/api-validation";
import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { deleteD1Post, getD1PostByIdOrSlug, updateD1Post } from "#/lib/cms-d1";
import { applyPublishingAutomation } from "#/lib/content-automation.server";

export const Route = createFileRoute("/api/posts/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:read");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const post = await getD1PostByIdOrSlug(params.id, true);

        if (!post) {
          return jsonResponse({ error: "Post not found" }, { status: 404 });
        }

        return jsonResponse({ data: localizePost(post, locale), locale });
      },
      PATCH: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const rawBody = await readJsonBody<Record<string, unknown>>(request);
        const [body, validationError] = validateBody(PostPatchSchema, rawBody);

        if (validationError) {
          return validationError;
        }

        if (body.status === "published" || body.status === "scheduled") {
          const publishError = await requireCmsAccess(request, "posts:publish");

          if (publishError) {
            return publishError;
          }
        }

        const locale = getApiLocale(request);
        const post = await getD1PostByIdOrSlug(params.id);

        if (!post) {
          return jsonResponse({ error: "Post not found" }, { status: 404 });
        }

        if (post.externalSource?.kind === "obsidian_git") {
          return jsonResponse(
            {
              error:
                "Obsidian-synced posts are read-only in the admin API. Edit the source file and run the Obsidian sync again.",
            },
            { status: 409 },
          );
        }

        const updated = await updateD1Post(
          post.id,
          await applyPublishingAutomation({ ...body, locale }, post),
        );
        const responsePost = updated ?? post;

        return jsonResponse({
          data: localizePost(responsePost, locale),
          requiredScope: "posts:write",
        });
      },
      DELETE: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const post = await getD1PostByIdOrSlug(params.id);

        if (!post) {
          return jsonResponse({ error: "Post not found" }, { status: 404 });
        }

        if (post.externalSource?.kind === "obsidian_git") {
          return jsonResponse(
            {
              error:
                "Obsidian-synced posts are deleted from Git. Remove publish: true or delete the source file and run the Obsidian sync again.",
            },
            { status: 409 },
          );
        }

        const deleted = await deleteD1Post(post.id);

        return jsonResponse({
          data: deleted ? localizePost(deleted, locale) : post,
          requiredScope: "posts:write",
        });
      },
    },
  },
});
