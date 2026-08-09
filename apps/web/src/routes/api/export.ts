import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { buildD1SiteExport } from "#/lib/cms-d1";
import { notifyExportCompleted } from "#/lib/cms-email";
import { buildExportZipBundle } from "#/lib/cms-export";
import { storeExportBackup, storeExportZipBackup } from "#/lib/cms-r2";

export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "export:read");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);

        if (new URL(request.url).searchParams.get("format") === "zip") {
          const bundle = await buildExportZipBundle(locale);
          const backup = await storeExportZipBackup(bundle.bytes, bundle.filename).catch(
            () => null,
          );
          await notifyExportCompleted({
            format: "zip",
            backupKey: backup?.key ?? null,
            siteUrl: new URL(request.url).origin,
          });

          return new Response(toArrayBuffer(bundle.bytes), {
            headers: {
              "cache-control": "no-store",
              "content-type": "application/zip",
              "content-disposition": `attachment; filename="${bundle.filename}"`,
              "x-content-type-options": "nosniff",
              "x-blogcms-backup-key": backup?.key ?? "",
              "x-blogcms-exported-at": bundle.data.exportedAt,
              "x-blogcms-assets-bundled": String(bundle.assetCount),
              "x-blogcms-assets-missing": String(bundle.missingAssetKeys.length),
            },
          });
        }

        const data = await buildD1SiteExport(locale);
        const backup = await storeExportBackup(data).catch(() => null);
        await notifyExportCompleted({
          format: "json",
          backupKey: backup?.key ?? null,
          siteUrl: new URL(request.url).origin,
        });

        return jsonResponse({
          data,
          backup,
          requiredScope: "export:read",
        });
      },
    },
  },
});

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
