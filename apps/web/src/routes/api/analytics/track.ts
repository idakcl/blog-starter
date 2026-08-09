import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { trackD1PageView } from "#/lib/cms-d1";

type AnalyticsTrackBody = {
  path: string;
  postSlug: string | null;
  referrer: string | null;
};

export const Route = createFileRoute("/api/analytics/track")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<AnalyticsTrackBody>(request);
        const recorded = await trackD1PageView({
          path: typeof body.path === "string" ? body.path : "",
          postSlug: typeof body.postSlug === "string" ? body.postSlug : null,
          referrer: typeof body.referrer === "string" ? body.referrer : null,
          request,
        });

        return jsonResponse({ data: { recorded } });
      },
    },
  },
});
