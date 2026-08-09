import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { moderateD1Comment } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/comments/$id/spam")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "comments:moderate");

        if (accessError) {
          return accessError;
        }

        const comment = await moderateD1Comment(params.id, "spam");

        if (!comment) {
          return jsonResponse({ error: "Comment not found" }, { status: 404 });
        }

        return jsonResponse({
          data: { ...comment, updatedAt: new Date().toISOString() },
          requiredScope: "comments:moderate",
        });
      },
    },
  },
});
