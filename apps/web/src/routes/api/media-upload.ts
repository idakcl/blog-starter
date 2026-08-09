import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";

const MAX_MEDIA_UPLOAD_BYTES = 200 * 1024 * 1024;

export const Route = createFileRoute("/api/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "assets:write");

        if (accessError) {
          return accessError;
        }

        const token = env.NETPAN_API_TOKEN?.trim();

        if (!token) {
          return jsonResponse(
            { error: "Netpan image host is not configured on the server." },
            { status: 503 },
          );
        }

        const base = (env.NETPAN_API_BASE ?? "https://netpan.1234.nyc.mn").replace(/\/+$/, "");

        const contentType = request.headers.get("content-type") ?? "";

        if (!contentType.includes("multipart/form-data")) {
          return jsonResponse(
            { error: "Upload requires a multipart/form-data request with a file." },
            { status: 400 },
          );
        }

        const formData = await request.formData().catch(() => null);

        if (!formData) {
          return jsonResponse({ error: "Could not read the upload payload." }, { status: 400 });
        }

        const candidates = formData
          .getAll("file")
          .filter((item): item is File => item instanceof File && item.size > 0);

        if (candidates.length === 0) {
          return jsonResponse({ error: "No file provided." }, { status: 400 });
        }

        const oversized = candidates.find((file) => file.size > MAX_MEDIA_UPLOAD_BYTES);

        if (oversized) {
          return jsonResponse(
            { error: `Upload exceeds the ${formatBytes(MAX_MEDIA_UPLOAD_BYTES)} limit.` },
            { status: 413 },
          );
        }

        try {
          const upstreamForm = new FormData();

          for (const file of candidates) {
            upstreamForm.append("file", file, file.name);
          }

          const upstream = await fetch(`${base}/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "01mvp-blog/1.0 (+media-upload)",
            },
            body: upstreamForm,
          });

          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            return jsonResponse(
              { error: "Netpan rejected the upload.", detail: detail.slice(0, 500) },
              { status: 502 },
            );
          }

          const payload = (await upstream.json().catch(() => null)) as
            | Array<{ src?: string }>
            | { src?: string }
            | null;
          const entries = Array.isArray(payload) ? payload : payload ? [payload] : [];
          const uploaded = entries
            .map((entry) => normalizeUrl(base, entry?.src))
            .filter((url): url is string => Boolean(url));

          if (uploaded.length === 0) {
            return jsonResponse({ error: "Netpan returned no media URL." }, { status: 502 });
          }

          const data = candidates.map((file, index) => ({
            name: file.name,
            contentType: file.type || "application/octet-stream",
            url: uploaded[index] ?? uploaded[uploaded.length - 1],
          }));

          return jsonResponse({ data }, { status: 201 });
        } catch (error) {
          return jsonResponse(
            { error: error instanceof Error ? error.message : "Netpan upload failed." },
            { status: 502 },
          );
        }
      },
    },
  },
});

function normalizeUrl(base: string, src: string | undefined): string | null {
  if (!src) {
    return null;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return `${base}${src.startsWith("/") ? "" : "/"}${src}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
