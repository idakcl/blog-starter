import { localizePost, localizeSiteSettings, localizeTag } from "@repo/core";
import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "#/components/site-shell";
import { $getTagsPage, type TagsPageData } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/tags/")({
  loader: (): Promise<TagsPageData> => $getTagsPage(),
  component: TagsPage,
});

function TagsPage() {
  const locale = getCurrentLocale();
  const data: TagsPageData = Route.useLoaderData();
  const posts = data.posts.map((post) => localizePost(post, locale));
  const siteSettings = localizeSiteSettings(data.siteSettings, locale);
  const tags = data.tags.map((tag) => localizeTag(tag, locale));

  return (
    <SiteShell siteSettings={siteSettings}>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">{m.tags_title()}</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tags.map((tag) => {
            const count = posts.filter((post) =>
              post.tags.some((postTag) => postTag.slug === tag.slug),
            ).length;

            return (
              <Link
                key={tag.slug}
                to="/tags/$slug"
                params={{ slug: tag.slug }}
                className="rounded-lg border border-border/80 bg-card p-5 shadow-xs transition hover:border-ring/45"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-semibold">{tag.name}</h2>
                  <span className="rounded-sm bg-accent px-2 py-1 text-xs text-accent-foreground">
                    {m.posts_count({ count })}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{tag.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
