import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";
import { revokeD1ApiToken } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/tokens/$id/revoke")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const token = await revokeD1ApiToken(params.id);

        if (!token) {
          return jsonResponse({ error: "Token not found" }, { status: 404 });
        }

        return jsonResponse({ data: token, requiredScope: "site:write" });
      },
    },
  },
});
