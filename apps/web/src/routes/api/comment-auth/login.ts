import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { loginCommentUser, publicCommentUser } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/login")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<{ email: string; password: string }>(request);
        const result = await loginCommentUser(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Login failed",
        }));

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 401 });
        }

        return jsonResponse({ data: publicCommentUser(result.data) }, { headers: result.headers });
      },
    },
  },
});
