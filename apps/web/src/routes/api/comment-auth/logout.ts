import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { logoutCommentUser } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const result = await logoutCommentUser(request);

        return jsonResponse({ data: true }, { headers: result.headers });
      },
    },
  },
});
