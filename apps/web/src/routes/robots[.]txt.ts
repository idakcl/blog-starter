import { createFileRoute } from "@tanstack/react-router";

import { getD1SiteSettings } from "#/lib/cms-d1";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const siteSettings = await getD1SiteSettings();
        const body = siteSettings.indexingEnabled
          ? `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${siteSettings.url}/sitemap.xml
Sitemap: ${siteSettings.url}/sitemap-posts.xml
`
          : `User-agent: *
Disallow: /
`;

        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
