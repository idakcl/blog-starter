import { cachedGet } from "#/lib/cms-cache";
import { getD1SiteSettings, listD1Posts, listD1Series, listD1Tags } from "#/lib/cms-d1";
import { source } from "#/lib/source";

export async function getSitemapPaths() {
  return cachedGet("sitemap:paths", async () => {
    const siteSettings = await getD1SiteSettings();
    const [posts, tags, series] = await Promise.all([
      listD1Posts().catch(() => []),
      listD1Tags().catch(() => []),
      listD1Series().catch(() => []),
    ]);
    const docsPaths = source.getPages().map((page) => page.url);
    const pagePaths = ["", "/demo", "/blog", "/docs", "/series", "/tags", "/about"];
    const postPaths = posts.map((post) => `/blog/${post.slug}`);
    const taxonomyPaths = [
      ...series.map((item) => `/series/${item.slug}`),
      ...tags.map((tag) => `/tags/${tag.slug}`),
    ];

    const pageAndDocsPaths = Array.from(new Set([...pagePaths, ...docsPaths]));

    return {
      siteUrl: siteSettings.url,
      allPaths: [...pageAndDocsPaths, ...postPaths, ...taxonomyPaths],
      pagePaths: pageAndDocsPaths,
      postPaths,
    };
  });
}

export function sitemapXml(siteUrl: string, paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

export function sitemapResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
