import { createFileRoute } from "@tanstack/react-router";
import { waitUntil } from "cloudflare:workers";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { moderateD1Comment } from "#/lib/cms-d1";
import { notifyCommentReplyCreated } from "#/lib/comment-reply-notifications";

export const Route = createFileRoute("/api/comments/$id/approve")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "comments:moderate");

        if (accessError) {
          return accessError;
        }

        const comment = await moderateD1Comment(params.id, "approved");

        if (!comment) {
          return jsonResponse({ error: "Comment not found" }, { status: 404 });
        }

        waitUntil(
          notifyCommentReplyCreated(comment).catch((error: unknown) => {
            console.error("Comment reply notification failed", error);
          }),
        );

        return jsonResponse({
          data: { ...comment, updatedAt: new Date().toISOString() },
          requiredScope: "comments:moderate",
        });
      },
    },
  },
});
