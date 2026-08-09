import { createFileRoute } from "@tanstack/react-router";

import { revokeAccountSessions } from "#/lib/account-security";
import { getAdminUserFromRequest } from "#/lib/admin-auth";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/admin/users/$id/sessions")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const admin = await getAdminUserFromRequest(request).catch(() => null);

        if (!admin) {
          return jsonResponse({ error: "Admin authentication required" }, { status: 401 });
        }

        if (params.id === admin.id) {
          return jsonResponse(
            { error: "Current admin sessions cannot be revoked here" },
            { status: 400 },
          );
        }

        const result = await revokeAccountSessions(params.id).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Sessions could not be revoked",
        }));

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 404 });
        }

        return jsonResponse({ data: result.data });
      },
    },
  },
});
