import { localizePost, localizeSiteSettings, localizeTag } from "@repo/core";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PostCard } from "#/components/post-card";
import { SiteShell } from "#/components/site-shell";
import { $getTagPage, type TagPageData } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/tags/$slug")({
  loader: async ({ params }): Promise<TagPageData> => {
    const data = await $getTagPage({ data: { slug: params.slug } });

    if (!data) {
      throw notFound();
    }

    return data;
  },
  component: TagDetailPage,
});

function TagDetailPage() {
  const { posts, siteSettings, tag }: TagPageData = Route.useLoaderData();
  const locale = getCurrentLocale();
  const localizedSiteSettings = localizeSiteSettings(siteSettings, locale);
  const localizedTag = localizeTag(tag, locale);
  const localizedPosts = posts.map((post) => localizePost(post, locale));

  return (
    <SiteShell siteSettings={localizedSiteSettings}>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-link uppercase">{m.tag_eyebrow()}</p>
        <h1 className="mt-3 text-4xl font-semibold">{localizedTag.name}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {localizedTag.description}
        </p>
        <div className="mt-8 grid gap-5">
          {localizedPosts.map((post) => (
            <PostCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
