import { createFileRoute } from "@tanstack/react-router";

import { redirectToGitHubForCommentLogin } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/github/start")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => redirectToGitHubForCommentLogin(request),
    },
  },
});
