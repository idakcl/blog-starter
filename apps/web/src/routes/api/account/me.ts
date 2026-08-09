import { createFileRoute } from "@tanstack/react-router";

import { getAccountSessionFromRequest } from "#/lib/account-auth";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/account/me")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const session = await getAccountSessionFromRequest(request, {
          disableCookieCache: url.searchParams.get("disableCookieCache") === "true",
          disableRefresh: url.searchParams.get("disableRefresh") === "true",
        });

        if (!session.user) {
          return jsonResponse({ data: null }, { headers: session.headers, status: 401 });
        }

        return jsonResponse({ data: session.user }, { headers: session.headers });
      },
    },
  },
});
