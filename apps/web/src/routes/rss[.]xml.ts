import { localizePost } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { getD1SiteSettings, listD1Posts } from "#/lib/cms-d1";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const siteSettings = await getD1SiteSettings();

        if (!siteSettings.rssEnabled) {
          return new Response("RSS feed is disabled.", {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          });
        }

        const xml = await renderRss(siteSettings);

        return new Response(xml, {
          headers: {
            "content-type": "application/rss+xml; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});

async function renderRss(siteSettings: Awaited<ReturnType<typeof getD1SiteSettings>>) {
  const locale = siteSettings.primaryLanguage;
  const posts = (await listD1Posts().catch(() => [])).map((post) => localizePost(post, locale));
  const localizedSiteSettings = await getD1SiteSettings(locale);

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(localizedSiteSettings.name)}</title>
    <link>${localizedSiteSettings.url}</link>
    <description>${escapeXml(localizedSiteSettings.description)}</description>
    ${posts
      .map(
        (post) => `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${localizedSiteSettings.url}/blog/${post.slug}</link>
      <guid>${localizedSiteSettings.url}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`,
      )
      .join("\n    ")}
  </channel>
</rss>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
