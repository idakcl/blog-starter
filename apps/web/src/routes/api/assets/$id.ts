import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { deleteD1Asset } from "#/lib/cms-d1";
import { deleteR2Asset } from "#/lib/cms-r2";

export const Route = createFileRoute("/api/assets/$id")({
  server: {
    handlers: {
      DELETE: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const accessError = await requireCmsAccess(request, "assets:write");

        if (accessError) {
          return accessError;
        }

        const persistedAsset = await deleteD1Asset(params.id).catch(() => undefined);

        if (persistedAsset) {
          await deleteR2Asset(persistedAsset.key).catch(() => undefined);

          return jsonResponse({
            data: persistedAsset,
            deleted: true,
            requiredScope: "assets:write",
          });
        }

        return jsonResponse({ error: "Asset not found" }, { status: 404 });
      },
    },
  },
});
