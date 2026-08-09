import { createFileRoute } from "@tanstack/react-router";

import { getAdminSessionFromRequest, publicAdminUser } from "#/lib/admin-auth";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/admin/me")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const session = await getAdminSessionFromRequest(request, {
          disableCookieCache: url.searchParams.get("disableCookieCache") === "true",
          disableRefresh: url.searchParams.get("disableRefresh") === "true",
        });

        if (!session.user) {
          return jsonResponse({ data: null }, { headers: session.headers, status: 401 });
        }

        return jsonResponse({ data: publicAdminUser(session.user) }, { headers: session.headers });
      },
    },
  },
});
