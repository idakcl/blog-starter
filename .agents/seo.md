# SEO Patterns

Use route `head()` for page SEO, following TanStack Start docs.

## Route Pattern

- Use route `head()` for page SEO metadata.
- Pass a route-relative `canonicalPath` such as `"/blog"` or `` `/blog/${params.slug}` ``.
- Use `loaderData` for dynamic titles, descriptions, and images.
- Use `robots: { index: false, follow: false }` for admin pages, editors, and internal pages.

## Root Route

- Set a site-level `titleTemplate` in the root route and let routes pass short page titles.
- Provide a site-level default Open Graph image in the root route.
- Override `images` only when a route has a better page-specific image.
- Only set `includeDocumentMeta: true` at the root.

## Titles And Images

- Prefer a site-level `titleTemplate` and let routes pass short page titles.
- Provide a site-level default Open Graph image.
- Override `images` only when a route has a better page-specific image.

## Sitemap And Feeds

- This project has dedicated route files for sitemap, RSS, and feed generation:
  - `sitemap[.]xml.ts`, `sitemap-pages[.]xml.ts`, `sitemap-posts[.]xml.ts`
  - `rss[.]xml.ts`, `feed[.]xml.ts`
  - `robots[.]txt.ts`
- Keep these route files in `apps/web/src/routes/`.
- Do not add a separate SEO package unless the project explicitly needs one.

## Limitations

- Wrong `canonicalPath` inputs will produce wrong SEO output.
- TanStack Start route heads are explicit per route. Do not rely on Next.js-style metadata inheritance.
