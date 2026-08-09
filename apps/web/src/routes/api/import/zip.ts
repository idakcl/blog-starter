import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, importPreview, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { createD1Post } from "#/lib/cms-d1";
import { notifyImportCompleted } from "#/lib/cms-email";
import { parseZipImport, type ZipImportInput } from "#/lib/cms-import";
import { storeImportPackage } from "#/lib/cms-r2";

export const Route = createFileRoute("/api/import/zip")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "posts:write");

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<ZipImportInput>(request);
        const input = {
          ...body,
          locale: body.locale ?? getApiLocale(request),
        };
        let imported;

        try {
          imported = await parseZipImport(input, { uploadAssets: false });
        } catch (error) {
          return jsonResponse(
            { error: error instanceof Error ? error.message : "ZIP import failed" },
            { status: 400 },
          );
        }

        if (imported.post.status === "published" || imported.post.status === "scheduled") {
          const publishError = await requireCmsAccess(request, "posts:publish");

          if (publishError) {
            return publishError;
          }
        }

        try {
          imported = await parseZipImport(input);
        } catch (error) {
          return jsonResponse(
            { error: error instanceof Error ? error.message : "ZIP import failed" },
            { status: 400 },
          );
        }

        const locale = imported.post.locale ?? getApiLocale(request);
        const post = await createD1Post({
          ...imported.post,
          source: "import",
          locale,
        });
        const asset = body.contentBase64
          ? await storeImportPackage({
              filename: body.filename || "import.zip",
              contentType: "application/zip",
              contentBase64: body.contentBase64,
              attachedPostId: post.id,
            })
          : null;
        await notifyImportCompleted({
          kind: "zip",
          post,
          siteUrl: new URL(request.url).origin,
        });

        return jsonResponse(
          {
            data: {
              ...importPreview("zip", body.filename),
              post,
              packageAsset: asset,
              assets: imported.assets,
              selectedEntry: imported.selectedEntry,
              entries: imported.entries,
              kind: imported.kind,
            },
            supportedPackages: ["markdown-with-images", "html-with-assets", "gallery-images"],
            requiredScope: "posts:write",
          },
          { status: 202 },
        );
      },
    },
  },
});
