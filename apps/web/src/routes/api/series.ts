import { localizeSeries, resolveLocale } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { createD1Series, listD1Series } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/series")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:read");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const series = await listD1Series();

        return jsonResponse({
          data: series.map((item) => localizeSeries(item, locale)),
          locale,
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<Parameters<typeof createD1Series>[0]>(request);
        const series = await createD1Series({
          ...body,
          locale: resolveLocale(body.locale),
        });

        if (!series) {
          return jsonResponse({ error: "Series name is required" }, { status: 400 });
        }

        const locale = getApiLocale(request);

        return jsonResponse(
          {
            data: localizeSeries(series, locale),
            requiredScope: "posts:write",
          },
          { status: 201 },
        );
      },
    },
  },
});
