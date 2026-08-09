import { createFileRoute } from "@tanstack/react-router";

import { getSitemapPaths, sitemapResponse, sitemapXml } from "#/lib/sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { allPaths, siteUrl } = await getSitemapPaths();

        return sitemapResponse(sitemapXml(siteUrl, allPaths));
      },
    },
  },
});
