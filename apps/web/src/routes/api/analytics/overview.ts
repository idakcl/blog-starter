import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { getD1AnalyticsOverview } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/analytics/overview")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "site:read");

        if (accessError) {
          return accessError;
        }

        const url = new URL(request.url);
        const days = Number(url.searchParams.get("days") ?? 7);
        const overview = await getD1AnalyticsOverview(days);

        return jsonResponse({
          data: overview,
          requiredScope: "site:read",
        });
      },
    },
  },
});
