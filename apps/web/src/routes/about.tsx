import { localizeSiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, ExternalLinkIcon, MailIcon, SparklesIcon } from "lucide-react";

import { SiteShell } from "#/components/site-shell";
import { $getAboutPageData } from "#/lib/cms-server";
import { getDocsUrl } from "#/lib/docs-i18n";
import { getCurrentLocale } from "#/lib/i18n";

export const Route = createFileRoute("/about")({
  loader: () => $getAboutPageData(),
  head: () => {
    const locale = getCurrentLocale();

    return {
      meta: [
        {
          title: locale === "zh" ? "关于 01MVP 和 Jackie" : "About 01MVP and Jackie",
        },
        {
          name: "description",
          content:
            locale === "zh"
              ? "了解 01MVP 的 AI 产品实战方法，以及 MakerJackie 的项目背景。"
              : "Learn about the 01MVP practical AI product method and MakerJackie's background.",
        },
      ],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  const data = Route.useLoaderData();
  const locale = getCurrentLocale();
  const siteSettings = localizeSiteSettings(data.siteSettings, locale);
  const copy = getAboutCopy(locale);
  const docsHref = getDocsUrl([], locale);

  return (
    <SiteShell siteSettings={siteSettings}>
      <div className="bg-background">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.62fr)_minmax(280px,0.38fr)] lg:px-8 lg:py-16">
            <div>
              <p className="text-sm font-semibold tracking-wide text-link uppercase">
                {copy.eyebrow}
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl leading-[0.98] font-semibold text-balance sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {copy.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  render={<a href={docsHref} aria-label={copy.primaryAction} />}
                  nativeButton={false}
                >
                  {copy.primaryAction}
                  <ArrowRightIcon />
                </Button>
                <Button
                  render={<a href="https://makerjackie.com" aria-label={copy.secondaryAction} />}
                  variant="outline"
                  nativeButton={false}
                >
                  {copy.secondaryAction}
                  <ExternalLinkIcon />
                </Button>
              </div>
            </div>

            <aside className="border border-border bg-muted/35 p-5">
              <img
                src="/jackie-avatar.jpg"
                alt="MakerJackie"
                className="aspect-square w-full object-cover"
              />
              <div className="mt-5">
                <p className="text-sm font-semibold text-link uppercase">MakerJackie</p>
                <p className="mt-2 text-2xl font-semibold">{copy.profileTitle}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.profileBody}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-border bg-muted/35">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.36fr_0.64fr] lg:px-8 lg:py-16">
            <div>
              <p className="text-sm font-semibold text-link uppercase">{copy.whyEyebrow}</p>
              <h2 className="mt-3 text-3xl font-semibold text-balance">{copy.whyTitle}</h2>
            </div>
            <div className="grid gap-4">
              {copy.principles.map((principle) => (
                <article key={principle.title} className="border-t border-border pt-4">
                  <div className="flex items-start gap-3">
                    <SparklesIcon className="mt-1 size-4 shrink-0 text-link" />
                    <div>
                      <h3 className="text-xl font-semibold">{principle.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {principle.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-px border border-border bg-border md:grid-cols-3">
              {copy.paths.map((path) => (
                <a
                  key={path.href}
                  href={path.href}
                  className="bg-background p-5 transition hover:bg-muted/45"
                >
                  <p className="text-xs font-semibold tracking-wide text-link uppercase">
                    {path.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold">{path.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{path.description}</p>
                </a>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <a
                href="mailto:hi@01mvp.com"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-link hover:underline"
              >
                <MailIcon className="size-4" />
                hi@01mvp.com
              </a>
              <a
                href="https://x.com/makerjackie"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-link hover:underline"
              >
                X / Twitter
                <ExternalLinkIcon className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function getAboutCopy(locale: ReturnType<typeof getCurrentLocale>) {
  if (locale === "zh") {
    return {
      eyebrow: "关于 01MVP",
      title: "把模糊想法，做成能上线的小产品。",
      description:
        "01MVP 是 Jackie 持续整理的 AI 产品实战手册。它关注从选择问题、搭建第一版、上线验证，到根据反馈继续迭代的完整路径。",
      primaryAction: "开始阅读手册",
      secondaryAction: "查看作品集",
      profileTitle: "独立开发者，前 AI 算法工程师",
      profileBody: "Jackie 是周周黑客松社区发起人，也长期记录 AI 创作、产品实验和可复用模板。",
      whyEyebrow: "方法",
      whyTitle: "这套手册强调什么",
      principles: [
        {
          title: "先做出来",
          description: "先用一个小项目建立手感，再通过上线后的反馈判断下一步。",
        },
        {
          title: "少踩坑",
          description: "优先讲值得先学、能直接上手、能被真实项目验证的工具和方法。",
        },
        {
          title: "面向交付",
          description: "把 Demo 作为阶段检查点，继续推进到发布、反馈和下一轮迭代。",
        },
      ],
      paths: [
        {
          eyebrow: "Start",
          title: "读 01MVP 手册",
          description: "按从想法到上线的路径建立完整工作流。",
          href: getDocsUrl([], "zh"),
        },
        {
          eyebrow: "Work",
          title: "看 MakerJackie 作品",
          description: "查看 Jackie 做过的产品、公开实验和长期项目。",
          href: "https://makerjackie.com",
        },
        {
          eyebrow: "Template",
          title: "回到博客模板",
          description: "了解这个 Cloudflare 原生博客模板如何部署和维护。",
          href: "/",
        },
      ],
    };
  }

  return {
    eyebrow: "About 01MVP",
    title: "Turning rough ideas into small products that can ship.",
    description:
      "01MVP is Jackie’s practical AI product handbook. It focuses on choosing a real problem, building the first version, launching, collecting feedback, and deciding what to do next.",
    primaryAction: "Start reading",
    secondaryAction: "View portfolio",
    profileTitle: "Independent developer and former AI algorithm engineer",
    profileBody:
      "Jackie founded Hackathon Weekly and keeps publishing AI creation notes, product experiments, and reusable templates.",
    whyEyebrow: "Method",
    whyTitle: "What this handbook emphasizes",
    principles: [
      {
        title: "Ship the first version",
        description:
          "Use a small project to build product muscle, then let real feedback guide the next step.",
      },
      {
        title: "Avoid the expensive detours",
        description:
          "Prioritize tools and methods that are worth learning early and can be used in real projects.",
      },
      {
        title: "Stay close to delivery",
        description:
          "Treat the demo as a checkpoint, then move the work toward launch, feedback, and iteration.",
      },
    ],
    paths: [
      {
        eyebrow: "Start",
        title: "Read the 01MVP handbook",
        description: "Follow the path from idea to launch and build a complete working loop.",
        href: getDocsUrl([], "en"),
      },
      {
        eyebrow: "Work",
        title: "View MakerJackie projects",
        description:
          "Browse products, public experiments, and long-running projects Jackie has built.",
        href: "https://makerjackie.com",
      },
      {
        eyebrow: "Template",
        title: "Return to the blog template",
        description: "See how this Cloudflare-native blog template is deployed and maintained.",
        href: "/",
      },
    ],
  };
}
