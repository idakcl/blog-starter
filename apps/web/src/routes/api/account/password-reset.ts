import { createFileRoute } from "@tanstack/react-router";

import { confirmAccountPasswordReset, requestAccountPasswordReset } from "#/lib/account-security";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";

export const Route = createFileRoute("/api/account/password-reset")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<{
          email?: string;
          password?: string;
          token?: string;
        }>(request);

        if (body.token) {
          const result = await confirmAccountPasswordReset(body.token, body.password).catch(
            (error: unknown) => ({
              error:
                error instanceof Error ? error.message : "Password reset could not be confirmed.",
            }),
          );

          if ("error" in result) {
            return jsonResponse({ error: result.error }, { status: 400 });
          }

          return jsonResponse({ data: result.data });
        }

        const result = await requestAccountPasswordReset(body.email, request);

        return jsonResponse({ data: result }, { status: 202 });
      },
    },
  },
});
