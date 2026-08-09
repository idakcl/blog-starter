import { createFileRoute } from "@tanstack/react-router";

import { redirectToGoogleForCommentLogin } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/google/start")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => redirectToGoogleForCommentLogin(request),
    },
  },
});
