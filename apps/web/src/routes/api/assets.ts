import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { listD1Assets } from "#/lib/cms-d1";
import {
  AssetUploadTooLargeError,
  getR2StorageStatus,
  readAssetUpload,
  uploadAssetToR2,
} from "#/lib/cms-r2";

export const Route = createFileRoute("/api/assets")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "site:read");

        if (accessError) {
          return accessError;
        }

        const [persistedAssets, storage] = await Promise.all([
          listD1Assets().catch(() => []),
          getR2StorageStatus(),
        ]);

        return jsonResponse({
          data: persistedAssets,
          storage,
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "assets:write");

        if (accessError) {
          return accessError;
        }

        let upload: Awaited<ReturnType<typeof readAssetUpload>>;

        try {
          upload = await readAssetUpload(request);
        } catch (error) {
          return jsonResponse(
            {
              error:
                error instanceof AssetUploadTooLargeError
                  ? error.message
                  : "Upload requires a file.",
              requiredScope: "assets:write",
            },
            { status: error instanceof AssetUploadTooLargeError ? 413 : 400 },
          );
        }

        try {
          const asset = await uploadAssetToR2(upload);

          return jsonResponse({ data: asset, requiredScope: "assets:write" }, { status: 201 });
        } catch (error) {
          if (error instanceof AssetUploadTooLargeError) {
            return jsonResponse(
              {
                error: error.message,
                requiredScope: "assets:write",
              },
              { status: 413 },
            );
          }

          const storage = await getR2StorageStatus();
          const status = storage.status === "ready" ? 500 : 503;

          return jsonResponse(
            {
              error:
                storage.status === "ready"
                  ? "Asset upload failed"
                  : "R2 storage is not ready for uploads",
              requiredScope: "assets:write",
              storage,
            },
            { status },
          );
        }
      },
    },
  },
});
