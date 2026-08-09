import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, importPreview, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { createD1Post } from "#/lib/cms-d1";
import { notifyImportCompleted } from "#/lib/cms-email";
import { parseHtmlImport, type ImportPostInput } from "#/lib/cms-import";

export const Route = createFileRoute("/api/import/html")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<ImportPostInput>(request);
        const parsed = parseHtmlImport({
          ...body,
          locale: body.locale ?? getApiLocale(request),
        });

        if (parsed.status === "published" || parsed.status === "scheduled") {
          const publishError = await requireCmsAccess(request, "posts:publish");

          if (publishError) {
            return publishError;
          }
        }

        const locale = parsed.locale ?? getApiLocale(request);
        const post = await createD1Post({
          ...parsed,
          source: "html_upload",
          locale,
        });
        await notifyImportCompleted({
          kind: "html",
          post,
          siteUrl: new URL(request.url).origin,
        });

        return jsonResponse(
          {
            data: {
              ...importPreview("html", body.filename),
              post,
            },
            mode: "sanitized",
            requiredScope: "posts:write",
          },
          { status: 202 },
        );
      },
    },
  },
});
