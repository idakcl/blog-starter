import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { getCommentSessionFromRequest, publicCommentUser } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/me")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await getCommentSessionFromRequest(request);

        return jsonResponse(
          { data: session.user ? publicCommentUser(session.user) : null },
          { headers: session.headers },
        );
      },
    },
  },
});
