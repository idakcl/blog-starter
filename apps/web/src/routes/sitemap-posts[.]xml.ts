import { createFileRoute } from "@tanstack/react-router";

import { getSitemapPaths, sitemapResponse, sitemapXml } from "#/lib/sitemap";

export const Route = createFileRoute("/sitemap-posts.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { postPaths, siteUrl } = await getSitemapPaths();

        return sitemapResponse(sitemapXml(siteUrl, postPaths));
      },
    },
  },
});
