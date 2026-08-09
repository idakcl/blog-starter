import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { publicCommentUser, signupCommentUser } from "#/lib/comment-auth";

export const Route = createFileRoute("/api/comment-auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<{
          email: string;
          emailPreference?: unknown;
          name: string;
          password: string;
        }>(request);
        const result = await signupCommentUser(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Signup failed",
        }));

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 400 });
        }

        if ("verificationRequired" in result) {
          return jsonResponse({ data: null, verificationRequired: true }, { status: 202 });
        }

        return jsonResponse({ data: publicCommentUser(result.data) }, { headers: result.headers });
      },
    },
  },
});
