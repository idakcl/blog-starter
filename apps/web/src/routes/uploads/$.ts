import { createFileRoute } from "@tanstack/react-router";

import { getR2Asset } from "#/lib/cms-r2";

export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { _splat?: string } }) => {
        const key = `uploads/${params._splat ?? ""}`;
        const object = await getR2Asset(key);

        if (!object?.body) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(object.body, {
          headers: {
            "cache-control": object.httpMetadata?.cacheControl ?? "public, max-age=31536000",
            "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
          },
        });
      },
    },
  },
});
