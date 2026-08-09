import { localizeSeries, resolveLocale } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { deleteD1Series, getD1SeriesByIdOrSlug, updateD1Series } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/series/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:read");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const series = await getD1SeriesByIdOrSlug(params.id);

        if (!series) {
          return jsonResponse({ error: "Series not found" }, { status: 404 });
        }

        return jsonResponse({ data: localizeSeries(series, locale), locale });
      },
      PATCH: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<Parameters<typeof updateD1Series>[1]>(request);
        const locale = getApiLocale(request);
        const series = await updateD1Series(params.id, {
          ...body,
          locale: resolveLocale(body.locale),
        });

        if (!series) {
          return jsonResponse({ error: "Series not found" }, { status: 404 });
        }

        return jsonResponse({
          data: localizeSeries(series, locale),
          requiredScope: "posts:write",
        });
      },
      DELETE: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const series = await deleteD1Series(params.id);

        if (!series) {
          return jsonResponse({ error: "Series not found" }, { status: 404 });
        }

        return jsonResponse({
          data: localizeSeries(series, locale),
          requiredScope: "posts:write",
        });
      },
    },
  },
});
