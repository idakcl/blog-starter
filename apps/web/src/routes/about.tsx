import { localizePost, localizeSiteSettings, type SupportedLocale } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "#/components/site-shell";
import { $getAboutPageData } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";

export const Route = createFileRoute("/about")({
  loader: () => $getAboutPageData(),
  head: ({ loaderData }) => {
    const locale = getCurrentLocale();
    const post = loaderData?.post ? localizePost(loaderData.post, locale) : null;

    return {
      meta: [
        { title: post?.title ?? (locale === "zh" ? "关于" : "About") },
        { name: "description", content: post?.excerpt ?? "" },
      ],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  const data = Route.useLoaderData();
  const locale = getCurrentLocale();
  const siteSettings = localizeSiteSettings(data.siteSettings, locale);
  const post = data.post ? localizePost(data.post, locale) : null;

  return (
    <SiteShell siteSettings={siteSettings}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {post ? (
          <article>
            <header className="mb-8">
              <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{post.excerpt}</p>
              ) : null}
            </header>
            <div
              className="prose prose-neutral prose-a:text-link prose-headings:scroll-mt-24 prose-headings:font-semibold dark:prose-invert max-w-none leading-8 [&>h1:first-child]:hidden"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </article>
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            {locale === "zh"
              ? "尚未发布关于页面。请在后台创建一篇别名（slug）为 About 的文章。"
              : "The about page has not been published yet. Create a post with the slug “About” in the dashboard."}
          </p>
        )}
      </div>
    </SiteShell>
  );
}
