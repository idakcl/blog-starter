import { createFileRoute } from "@tanstack/react-router";

import { requestAccountPasswordResetForUserId } from "#/lib/account-security";
import { jsonResponse } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";

export const Route = createFileRoute("/api/admin/users/$id/password-reset")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const result = await requestAccountPasswordResetForUserId(params.id, request).catch(
          (error: unknown) => ({
            error:
              error instanceof Error ? error.message : "Password reset email could not be sent",
          }),
        );

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 404 });
        }

        return jsonResponse({ data: result.data }, { status: 202 });
      },
    },
  },
});
