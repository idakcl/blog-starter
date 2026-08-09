import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requestCommentEmailVerification } from "#/lib/email-verification";

export const Route = createFileRoute("/api/account/verification-email")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<{ email?: string }>(request);
        const result = await requestCommentEmailVerification({
          email: body.email,
          request,
        });

        return jsonResponse({ data: result }, { status: 202 });
      },
    },
  },
});
