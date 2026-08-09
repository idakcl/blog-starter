import { localizePost, localizeSeries, localizeSiteSettings } from "@repo/core";
import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "#/components/site-shell";
import { $getSeriesPage, type SeriesPageData } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/series/")({
  loader: (): Promise<SeriesPageData> => $getSeriesPage(),
  component: SeriesPage,
});

function SeriesPage() {
  const locale = getCurrentLocale();
  const data: SeriesPageData = Route.useLoaderData();
  const posts = data.posts.map((post) => localizePost(post, locale));
  const siteSettings = localizeSiteSettings(data.siteSettings, locale);
  const series = data.series.map((item) => localizeSeries(item, locale));

  return (
    <SiteShell siteSettings={siteSettings}>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">{m.series_title()}</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {series.map((item) => {
            const count = posts.filter((post) => post.series?.slug === item.slug).length;

            return (
              <Link
                key={item.slug}
                to="/series/$slug"
                params={{ slug: item.slug }}
                className="rounded-lg border border-border/80 bg-card p-5 shadow-xs transition hover:border-ring/45"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-semibold">{item.name}</h2>
                  <span className="rounded-sm bg-accent px-2 py-1 text-xs text-accent-foreground">
                    {m.posts_count({ count })}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
