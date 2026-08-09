import { localizeSiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, FileTextIcon, LeafIcon, SearchIcon, SparklesIcon } from "lucide-react";

import { SiteShell } from "#/components/site-shell";
import { $getSiteSettingsPageData } from "#/lib/cms-server";
import { getDocsUrl } from "#/lib/docs-i18n";
import { getCurrentLocale } from "#/lib/i18n";

export const Route = createFileRoute("/demo")({
  loader: () => $getSiteSettingsPageData(),
  head: () => {
    const locale = getCurrentLocale();

    return {
      meta: [
        {
          title:
            locale === "zh"
              ? "博客首页 Demo | 01MVP Blog Starter"
              : "Blog Homepage Demo | 01MVP Blog Starter",
        },
        {
          name: "description",
          content:
            locale === "zh"
              ? "六个完整的个人博客首页样例。选择一种气质，把它变成自己的长期写作空间。"
              : "Six complete personal blog homepage examples. Choose the feeling you want your writing space to carry.",
        },
      ],
    };
  },
  component: DemoBlogPage,
});

type DemoKind = "crystal" | "brutalist" | "maker" | "magazine" | "garden" | "terminal";

type DemoPost = {
  readonly excerpt: string;
  readonly meta: string;
  readonly tag: string;
  readonly title: string;
};

type DemoHome = {
  readonly author: string;
  readonly id: string;
  readonly image: string;
  readonly kind: DemoKind;
  readonly label: string;
  readonly line: string;
  readonly name: string;
  readonly posts: readonly DemoPost[];
  readonly title: string;
};

function DemoBlogPage() {
  const { siteSettings } = Route.useLoaderData();
  const locale = getCurrentLocale();
  const localizedSiteSettings = localizeSiteSettings(siteSettings, locale);
  const copy = getDemoCopy(locale);
  const docsHref = getDocsUrl([], locale);

  return (
    <SiteShell siteSettings={localizedSiteSettings}>
      <div className="bg-background">
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.46fr)] lg:items-start lg:gap-16">
              <div className="lg:pt-2">
                <p className="text-sm font-semibold tracking-wide text-link uppercase">
                  {copy.eyebrow}
                </p>
                <h1 className="mt-5 max-w-4xl text-5xl leading-[0.96] font-semibold text-balance sm:text-6xl lg:text-7xl">
                  {copy.title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {copy.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    render={<a href="#crystal-home" aria-label={copy.primaryAction} />}
                    nativeButton={false}
                    size="lg"
                  >
                    <SparklesIcon />
                    {copy.primaryAction}
                  </Button>
                  <Button
                    render={<a href={docsHref} aria-label={copy.docsAction} />}
                    variant="outline"
                    nativeButton={false}
                    size="lg"
                  >
                    <FileTextIcon />
                    {copy.docsAction}
                  </Button>
                </div>
              </div>

              <nav className="border border-border bg-muted/30 p-4" aria-label={copy.choiceTitle}>
                <p className="text-sm font-semibold">{copy.choiceTitle}</p>
                <div className="mt-4 grid gap-2">
                  {copy.styles.map((style, index) => (
                    <a
                      key={style.id}
                      href={`#${style.id}`}
                      className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 border border-border bg-background px-3 text-sm transition hover:border-foreground"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate font-semibold">{style.name}</span>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {copy.styles.map((style) => (
              <HomepageScene
                key={style.id}
                chooseText={copy.chooseText}
                docsHref={docsHref}
                style={style}
              />
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function HomepageScene({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  switch (style.kind) {
    case "crystal":
      return <CrystalHome chooseText={chooseText} docsHref={docsHref} style={style} />;
    case "brutalist":
      return <BrutalistHome chooseText={chooseText} docsHref={docsHref} style={style} />;
    case "maker":
      return <MakerHome chooseText={chooseText} docsHref={docsHref} style={style} />;
    case "magazine":
      return <MagazineHome chooseText={chooseText} docsHref={docsHref} style={style} />;
    case "garden":
      return <GardenHome chooseText={chooseText} docsHref={docsHref} style={style} />;
    case "terminal":
      return <TerminalHome chooseText={chooseText} docsHref={docsHref} style={style} />;
  }
}

function ChooseLink({
  className,
  docsHref,
  text,
}: {
  readonly className?: string;
  readonly docsHref: string;
  readonly text: string;
}) {
  return (
    <a
      href={docsHref}
      className={
        className ??
        "inline-flex min-h-11 items-center gap-2 border border-current px-4 text-sm font-semibold transition hover:opacity-75"
      }
    >
      {text}
      <ArrowRightIcon className="size-4" />
    </a>
  );
}

function CrystalHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section
      id={style.id}
      className="scroll-mt-24 overflow-hidden border border-[#d6deeb] bg-[#f4f6fb] text-[#111827]"
    >
      <div className="grid min-h-[760px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#dde5f0] bg-white/80 p-5 shadow-[0_16px_50px_rgba(31,41,55,0.08)] backdrop-blur lg:border-r lg:border-b-0">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-[#111827]" />
            <span className="font-semibold tracking-tight">{style.author}</span>
          </div>
          <nav className="mt-10 grid gap-1 text-sm text-[#6b7280]">
            {["Home", "Letters", "Notes", "Archive"].map((item, index) => (
              <span
                key={item}
                className={
                  index === 0
                    ? "rounded-lg bg-[#eaf2ff] px-3 py-2 font-semibold text-[#2563eb]"
                    : "rounded-lg px-3 py-2"
                }
              >
                {index === 0 ? "✨ " : ""}
                {item}
              </span>
            ))}
          </nav>
          <p className="mt-10 rounded-lg border border-[#dde5f0] bg-[#f8fafc] p-3 text-xs leading-5 text-[#64748b]">
            {style.line}
          </p>
        </aside>

        <div className="p-4 sm:p-6 lg:p-8">
          <header className="flex items-center justify-between gap-3 rounded-lg border border-[#dbe4f0] bg-white/90 px-4 py-3 shadow-sm">
            <span className="flex items-center gap-2 text-sm text-[#64748b]">
              <SearchIcon className="size-4" />
              Search the archive
            </span>
            <ChooseLink
              docsHref={docsHref}
              text={chooseText}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8]"
            />
          </header>

          <main className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <article className="rounded-lg border border-[#dbe4f0] bg-white p-6 shadow-sm">
              <p className="inline-flex rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
                {style.label}
              </p>
              <h2 className="mt-7 max-w-2xl text-5xl leading-[0.96] font-semibold tracking-tight text-balance">
                {style.title}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#64748b]">
                {style.posts[0]?.excerpt}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {style.posts.map((post) => (
                  <article
                    key={post.title}
                    className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <p className="text-xs font-semibold text-[#2563eb]">{post.tag}</p>
                    <h3 className="mt-3 text-lg leading-tight font-semibold">{post.title}</h3>
                    <p className="mt-4 text-xs text-[#94a3b8]">{post.meta}</p>
                  </article>
                ))}
              </div>
            </article>

            <aside className="grid gap-5">
              <img
                src={style.image}
                alt=""
                loading="lazy"
                className="h-64 w-full rounded-lg border border-[#dbe4f0] object-cover shadow-sm"
              />
              <div className="rounded-lg border border-[#dbe4f0] bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold text-[#64748b] uppercase">Now reading</p>
                <p className="mt-3 text-2xl leading-tight font-semibold">
                  A quieter front door for a louder life.
                </p>
              </div>
            </aside>
          </main>
        </div>
      </div>
    </section>
  );
}

function BrutalistHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section
      id={style.id}
      className="scroll-mt-24 border-4 border-black bg-[#f2ea27] p-3 text-black"
    >
      <div className="min-h-[760px] border-4 border-black bg-[#fbfaf2] shadow-[10px_10px_0_#000]">
        <header className="grid border-b-4 border-black md:grid-cols-[1fr_auto]">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 font-mono text-xs font-black uppercase">
            <span>{style.author}</span>
            <span>Manifesto</span>
            <span>Field Notes</span>
            <span>Archive</span>
          </nav>
          <ChooseLink
            docsHref={docsHref}
            text={chooseText}
            className="inline-flex min-h-12 items-center justify-center gap-2 border-t-4 border-black bg-[#ff4b39] px-5 font-mono text-sm font-black uppercase md:border-t-0 md:border-l-4"
          />
        </header>

        <main className="grid min-h-[520px] lg:grid-cols-[1fr_0.72fr]">
          <div className="p-5 lg:p-8">
            <p className="inline-block border-4 border-black bg-white px-3 py-2 font-mono text-xs font-black uppercase">
              {style.label}
            </p>
            <h2 className="mt-8 max-w-3xl text-6xl leading-[0.86] font-black tracking-tight text-balance uppercase lg:text-8xl">
              {style.title}
            </h2>
            <p className="mt-7 max-w-xl text-xl leading-8 font-bold">{style.line}</p>
          </div>
          <img
            src={style.image}
            alt=""
            loading="lazy"
            className="h-72 w-full border-t-4 border-black object-cover contrast-125 grayscale lg:h-full lg:border-t-0 lg:border-l-4"
          />
        </main>

        <div className="grid border-t-4 border-black md:grid-cols-3">
          {style.posts.map((post) => (
            <article
              key={post.title}
              className="min-h-48 border-b-4 border-black p-5 last:border-b-0 md:border-r-4 md:border-b-0 md:last:border-r-0"
            >
              <p className="font-mono text-xs font-black uppercase">{post.meta}</p>
              <h3 className="mt-5 text-3xl leading-none font-black">{post.title}</h3>
              <p className="mt-5 text-sm leading-6 font-semibold">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MakerHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section
      id={style.id}
      className="scroll-mt-24 border border-black/15 bg-white px-5 py-6 text-black sm:px-8 lg:px-12 lg:py-10"
    >
      <div className="mx-auto min-h-[760px] max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/20 pb-4">
          <p className="text-xl font-black tracking-tight">{style.author}</p>
          <nav className="flex flex-wrap gap-5 text-sm font-medium text-black/60">
            <span>随笔</span>
            <span>碎碎念</span>
            <span>作品集</span>
            <span>关于我</span>
          </nav>
        </header>

        <main className="grid gap-9 border-b border-black/20 py-10 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="inline-flex border border-black/20 bg-black px-3 py-1 text-xs font-semibold tracking-[0.14em] text-white uppercase">
              {style.label}
            </p>
            <h2 className="mt-6 max-w-3xl text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl">
              {style.title}
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/62">{style.line}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ChooseLink docsHref={docsHref} text={chooseText} />
              <a
                href="/blog"
                className="inline-flex min-h-11 items-center gap-2 border border-black/20 px-4 text-sm font-semibold transition hover:bg-black hover:text-white"
              >
                全部文章
                <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>
          <img
            src={style.image}
            alt=""
            loading="lazy"
            className="aspect-square w-full border border-black/20 object-cover grayscale"
          />
        </main>

        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_0.8fr]">
          <section className="divide-y divide-black/15 border-y border-black/20">
            {style.posts.map((post) => (
              <article key={post.title} className="grid gap-3 py-5 sm:grid-cols-[1fr_110px]">
                <div>
                  <p className="text-xs font-semibold text-black/48">{post.tag}</p>
                  <h3 className="mt-2 text-2xl leading-tight font-bold">{post.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-black/58">{post.excerpt}</p>
                </div>
                <p className="font-mono text-xs text-black/45 sm:text-right">{post.meta}</p>
              </article>
            ))}
          </section>
          <aside className="border border-black/20 p-5">
            <p className="font-mono text-xs font-semibold tracking-[0.14em] text-black/48 uppercase">
              Home base
            </p>
            <p className="mt-5 text-2xl leading-tight font-bold">
              A clean page for writing, projects, and the few links that matter.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MagazineHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section
      id={style.id}
      className="scroll-mt-24 bg-[#f5ecd9] px-4 py-5 font-serif text-[#24160c] sm:px-8 lg:px-10"
    >
      <div className="min-h-[760px] border-y border-[#24160c]">
        <header className="grid gap-3 border-b border-[#24160c] py-4 text-center">
          <p className="text-xs tracking-[0.36em] uppercase">{style.author}</p>
          <h2 className="text-5xl leading-none font-bold tracking-tight sm:text-7xl">
            {style.name}
          </h2>
          <p className="text-sm tracking-[0.18em] uppercase">{style.label}</p>
        </header>

        <main className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article>
            <p className="text-xs font-bold tracking-[0.2em] uppercase">{style.posts[0]?.meta}</p>
            <h3 className="mt-5 max-w-4xl text-6xl leading-[0.88] font-bold text-balance lg:text-8xl">
              {style.title}
            </h3>
            <p className="mt-6 max-w-2xl text-xl leading-9">{style.line}</p>
            <div className="mt-8">
              <ChooseLink docsHref={docsHref} text={chooseText} />
            </div>
          </article>
          <img
            src={style.image}
            alt=""
            loading="lazy"
            className="aspect-[4/5] w-full border border-[#24160c] object-cover sepia"
          />
        </main>

        <div className="grid gap-6 border-t border-[#24160c] py-6 md:grid-cols-3">
          {style.posts.map((post) => (
            <article
              key={post.title}
              className="border-b border-[#24160c] pb-5 md:border-r md:border-b-0 md:pr-5 md:last:border-r-0"
            >
              <p className="text-xs tracking-[0.18em] uppercase">{post.tag}</p>
              <h3 className="mt-4 text-3xl leading-tight font-bold">{post.title}</h3>
              <p className="mt-4 text-base leading-7">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GardenHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section id={style.id} className="scroll-mt-24 bg-[#e8f0df] p-4 text-[#172416]">
      <div className="min-h-[760px] rounded-lg border border-[#b7c8a9] bg-[#f7faef] p-5 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#d5e6c8]">
              <LeafIcon className="size-5" />
            </span>
            <p className="text-lg font-semibold">{style.author}</p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm text-[#62785a]">
            <span>Journal</span>
            <span>Reading</span>
            <span>Places</span>
            <span>Letters</span>
          </nav>
        </header>

        <main className="mt-10 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <img
            src={style.image}
            alt=""
            loading="lazy"
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#6b8a53] uppercase">
              {style.label}
            </p>
            <h2 className="mt-5 max-w-3xl text-5xl leading-[0.95] font-semibold text-balance sm:text-6xl">
              {style.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#51634b]">{style.line}</p>
            <div className="mt-8">
              <ChooseLink
                docsHref={docsHref}
                text={chooseText}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#172416] px-4 text-sm font-semibold text-[#f7faef] transition hover:bg-[#2d3d29]"
              />
            </div>
          </div>
        </main>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {style.posts.map((post) => (
            <article
              key={post.title}
              className="rounded-lg border border-[#b7c8a9] bg-[#fffdf5] p-5 transition hover:-translate-y-0.5"
            >
              <p className="text-xs font-semibold text-[#6b8a53]">{post.tag}</p>
              <h3 className="mt-3 text-2xl leading-tight font-semibold">{post.title}</h3>
              <p className="mt-4 text-sm leading-6 text-[#65765d]">{post.excerpt}</p>
              <p className="mt-5 text-xs text-[#7b8c73]">{post.meta}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TerminalHome({
  chooseText,
  docsHref,
  style,
}: {
  readonly chooseText: string;
  readonly docsHref: string;
  readonly style: DemoHome;
}) {
  return (
    <section id={style.id} className="scroll-mt-24 bg-[#07100b] p-4 font-mono text-[#d9ffe7]">
      <div className="min-h-[760px] border border-[#2f6f4b] bg-[#0f1713] shadow-[0_0_80px_rgba(82,224,141,0.12)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f6f4b] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#ff5d5d]" />
            <span className="size-2 rounded-full bg-[#ffd166]" />
            <span className="size-2 rounded-full bg-[#52e08d]" />
            <span className="ml-3 text-xs text-[#7ab891]">~/public/home.md</span>
          </div>
          <ChooseLink
            docsHref={docsHref}
            text={chooseText}
            className="inline-flex min-h-10 items-center gap-2 border border-[#52e08d] px-3 text-xs font-semibold text-[#52e08d] transition hover:bg-[#52e08d] hover:text-[#07100b]"
          />
        </header>

        <main className="grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-8">
          <div>
            <p className="text-sm text-[#7ab891]">$ open {style.author}</p>
            <h2 className="mt-6 max-w-4xl text-5xl leading-tight font-bold text-balance text-[#f2fff7] sm:text-6xl">
              # {style.title}
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#9bd6af]">{style.line}</p>
            <div className="mt-10 divide-y divide-[#2f6f4b] border-y border-[#2f6f4b]">
              {style.posts.map((post) => (
                <article
                  key={post.title}
                  className="grid gap-3 py-4 sm:grid-cols-[94px_minmax(0,1fr)]"
                >
                  <p className="text-xs text-[#7ab891]">{post.meta}</p>
                  <div>
                    <h3 className="text-lg leading-tight text-[#f2fff7]">- {post.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#9bd6af]">{post.excerpt}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <img
              src={style.image}
              alt=""
              loading="lazy"
              className="aspect-square w-full border border-[#2f6f4b] object-cover opacity-80 mix-blend-screen"
            />
            <div className="border border-[#2f6f4b] bg-[#07100b] p-4">
              <p className="text-xs text-[#7ab891]">status</p>
              <p className="mt-3 text-2xl leading-tight text-[#f2fff7]">
                Writing is the changelog of a life.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </section>
  );
}

function getDemoCopy(locale: ReturnType<typeof getCurrentLocale>) {
  const images = {
    desk: "/demo/desk.jpg",
    garden: "/demo/garden.jpg",
    library: "/demo/library.jpg",
    notes: "/demo/notes.jpg",
    server: "/demo/server.jpg",
    writing: "/demo/writing.jpg",
  };

  if (locale === "zh") {
    return {
      choiceTitle: "选择一种首页",
      chooseText: "选择这个首页",
      description:
        "有人写产品，有人写日常，有人写代码，有人写长信。首页是一扇门，也是一间房：读者走进来，就能感到这个人的气质。",
      docsAction: "查看创建指南",
      eyebrow: "六个博客首页",
      primaryAction: "看第一个首页",
      title: "你的博客，可以有自己的气质。",
      styles: [
        {
          author: "晨间工作室",
          id: "crystal-home",
          image: images.desk,
          kind: "crystal",
          label: "清澈、留白、像刚打开的 Mac",
          line: "把计划、复盘与长文放在同一个安静的地方。读者进来时，先看到秩序，再慢慢看见人。",
          name: "澄明产品感",
          title: "把一间明亮的工作室，放进浏览器。",
          posts: [
            {
              excerpt: "一周的产品想法、决定与复盘，收在一张干净的桌面上。",
              meta: "6 分钟",
              tag: "工作札记",
              title: "如何把长期计划写得像一条清澈的河",
            },
            {
              excerpt: "写给未来自己的判断，也写给正在路过的读者。",
              meta: "4 分钟",
              tag: "复盘",
              title: "那些没有发布的功能，后来变成了路径",
            },
            {
              excerpt: "一个轻盈的首页，可以承载很重的思考。",
              meta: "8 分钟",
              tag: "系统",
              title: "让首页像工作台，也像一间安静的房间",
            },
          ],
        },
        {
          author: "粗粝电台",
          id: "brutalist-home",
          image: images.server,
          kind: "brutalist",
          label: "锋利、醒目、像一张贴在墙上的声明",
          line: "适合观点强烈的人。它不追求温顺，它要让读者在第一眼就知道，这里有人在认真表达。",
          name: "野兽现代派",
          title: "字要大，态度要站得住。",
          posts: [
            {
              excerpt: "如果一个个人站没有脾气，它就很容易被平台的噪声吞没。",
              meta: "今日",
              tag: "宣言",
              title: "别把自己的首页做得像临时借来的墙",
            },
            {
              excerpt: "粗黑边框给页面留下边界，也给读者留下判断。",
              meta: "现场",
              tag: "观察",
              title: "每一道边框都应该有理由",
            },
            {
              excerpt: "强烈不等于粗糙，克制也不等于沉默。",
              meta: "记录",
              tag: "设计",
              title: "野兽派也可以很清醒",
            },
          ],
        },
        {
          author: "Maker Jackie",
          id: "maker-home",
          image: images.writing,
          kind: "maker",
          label: "黑白、直接、像一个人站在门口说话",
          line: "文章、作品、联系方式都在一页里自然展开。没有多余装饰，只留下这个人真正关心的东西。",
          name: "黑白个人站",
          title: "记录 AI、产品、独立开发和一些真实的生活。",
          posts: [
            {
              excerpt: "把自己放在首页，是给读者一个进入的理由。",
              meta: "2026.05",
              tag: "随笔",
              title: "你好，我是 Maker Jackie",
            },
            {
              excerpt: "作品集和博客不必分开，它们本来就是同一个人的两种痕迹。",
              meta: "2026.05",
              tag: "作品",
              title: "一个个人站怎样慢慢长成基地",
            },
            {
              excerpt: "小页面也可以有重量，前提是每个入口都真的有用。",
              meta: "2026.04",
              tag: "笔记",
              title: "极简是一种选择",
            },
          ],
        },
        {
          author: "The Slow Letter",
          id: "editorial-home",
          image: images.library,
          kind: "magazine",
          label: "像周末翻开的一份私人杂志",
          line: "适合长文、访谈、书影音和年度总结。读者会慢下来，像进入一间安静的阅览室。",
          name: "电子杂志",
          title: "写给一周里慢下来的那一部分。",
          posts: [
            {
              excerpt: "一个归档可以是一间正在生长的阅览室。",
              meta: "Issue 18",
              tag: "长文",
              title: "把个人归档当作一间阅览室",
            },
            {
              excerpt: "被认真编辑过的首页，会让读者知道这里值得停留。",
              meta: "Column",
              tag: "文化",
              title: "小书房里的几条注释",
            },
            {
              excerpt: "精选文章需要呼吸，读者也需要。",
              meta: "Letter",
              tag: "来信",
              title: "首页的第一屏应该有一口气",
            },
          ],
        },
        {
          author: "Garden Log",
          id: "garden-home",
          image: images.garden,
          kind: "garden",
          label: "柔软、自然、像一本摊开的生活手帐",
          line: "写饭后散步、读书、旅行和季节变化。它不急着证明什么，只把日子慢慢保存下来。",
          name: "花园手帐",
          title: "把细小的日子，照顾成会发芽的文字。",
          posts: [
            {
              excerpt: "一天结束后的几句话，往往比宏大的计划更接近真实。",
              meta: "5 月 28 日",
              tag: "日常",
              title: "晚饭后写作的安静好处",
            },
            {
              excerpt: "书、路、天气和人，都会在笔记里彼此照面。",
              meta: "5 月 21 日",
              tag: "阅读",
              title: "书、散步，以及它们之间的空隙",
            },
            {
              excerpt: "季节性的首页，让记忆不再只是相册里的图片。",
              meta: "5 月 12 日",
              tag: "生活",
              title: "让一个春天留在页面上",
            },
          ],
        },
        {
          author: "devlog.sh",
          id: "terminal-home",
          image: images.notes,
          kind: "terminal",
          label: "暗色、等宽、像一份公开的工程日志",
          line: "适合技术写作、开源项目和研究记录。它像终端一样冷静，但每一行都能看到人的判断。",
          name: "终端 Devlog",
          title: "发布记录、补丁、研究和现场报告。",
          posts: [
            {
              excerpt: "一次周末发布留下的重构笔记，也是一段判断链。",
              meta: "r42",
              tag: "Patch",
              title: "一个周末版本里的重构记录",
            },
            {
              excerpt: "迁移运行时之后坏掉的东西，往往就是系统真正的形状。",
              meta: "r41",
              tag: "Research",
              title: "迁移 Worker 运行时后发生了什么",
            },
            {
              excerpt: "终端气质不等于只给开发者看，清晰仍然是第一原则。",
              meta: "r40",
              tag: "Guide",
              title: "让非开发者也能读懂 Devlog",
            },
          ],
        },
      ] satisfies DemoHome[],
    };
  }

  return {
    choiceTitle: "Choose a homepage",
    chooseText: "Choose this homepage",
    description:
      "Some people write products, some write ordinary days, some write code, and some write long letters. A homepage is more than an entrance. It is the room a reader steps into.",
    docsAction: "Read the creation guide",
    eyebrow: "Six blog homepages",
    primaryAction: "See the first homepage",
    title: "Your blog can carry its own atmosphere.",
    styles: [
      {
        author: "Morning Studio",
        id: "crystal-home",
        image: images.desk,
        kind: "crystal",
        label: "Clear, spacious, like opening a Mac in morning light",
        line: "Plans, retrospectives, and essays live in one quiet place. Readers meet order first, then gradually meet the person.",
        name: "Crystal Product",
        title: "A bright studio, placed inside the browser.",
        posts: [
          {
            excerpt: "Weekly product thoughts, decisions, and reflections on a clean desk.",
            meta: "6 min",
            tag: "Studio note",
            title: "How to make long plans feel like clear water",
          },
          {
            excerpt: "Judgment for your future self, with enough room for a passing reader.",
            meta: "4 min",
            tag: "Review",
            title: "The features I did not ship became the path",
          },
          {
            excerpt: "A light homepage can still carry serious thinking.",
            meta: "8 min",
            tag: "System",
            title: "Make the homepage a desk, not a directory",
          },
        ],
      },
      {
        author: "Raw Radio",
        id: "brutalist-home",
        image: images.server,
        kind: "brutalist",
        label: "Sharp, loud, like a statement taped to a wall",
        line: "For writers with a point of view. It refuses to be polite. It tells the reader that someone is here, thinking in public.",
        name: "Modern Brutalist",
        title: "The type is large because the stance is clear.",
        posts: [
          {
            excerpt: "A personal site without temperament is easily swallowed by platform noise.",
            meta: "Today",
            tag: "Manifesto",
            title: "Do not make your homepage look borrowed",
          },
          {
            excerpt: "A thick border gives the page a boundary.",
            meta: "Field",
            tag: "Note",
            title: "Every border should have a reason",
          },
          {
            excerpt: "Strong does not mean careless. Minimal does not mean silent.",
            meta: "Log",
            tag: "Design",
            title: "Brutalism can still be awake",
          },
        ],
      },
      {
        author: "Maker Jackie",
        id: "maker-home",
        image: images.writing,
        kind: "maker",
        label: "Black and white, direct, like a person at the door",
        line: "Articles, projects, and contact paths unfold on one page. No extra decoration, only what the author keeps returning to.",
        name: "Maker Monochrome",
        title: "Notes on AI, products, indie building, and real life.",
        posts: [
          {
            excerpt: "Putting yourself on the homepage gives the reader a reason to enter.",
            meta: "2026.05",
            tag: "Essay",
            title: "Hello, I am Maker Jackie",
          },
          {
            excerpt: "A portfolio and a blog are two traces from the same person.",
            meta: "2026.05",
            tag: "Project",
            title: "How a personal site becomes home base",
          },
          {
            excerpt: "A small page can carry weight when every doorway matters.",
            meta: "2026.04",
            tag: "Note",
            title: "Minimal is chosen space",
          },
        ],
      },
      {
        author: "The Slow Letter",
        id: "editorial-home",
        image: images.library,
        kind: "magazine",
        label: "A private magazine opened on a weekend",
        line: "For essays, interviews, books, films, and yearly reviews. The reader slows down, as if entering a quiet reading room.",
        name: "Digital Magazine",
        title: "For the slower part of the week.",
        posts: [
          {
            excerpt: "An archive can become a living reading room.",
            meta: "Issue 18",
            tag: "Essay",
            title: "Treat the archive as a reading room",
          },
          {
            excerpt: "An edited homepage tells the reader that staying is worthwhile.",
            meta: "Column",
            tag: "Culture",
            title: "Notes from a small private library",
          },
          {
            excerpt: "Featured writing needs room to breathe. So does the reader.",
            meta: "Letter",
            tag: "Letter",
            title: "The first screen should have one clear breath",
          },
        ],
      },
      {
        author: "Garden Log",
        id: "garden-home",
        image: images.garden,
        kind: "garden",
        label: "Soft and natural, like an open notebook",
        line: "For walks after dinner, books, travel, and seasons. It keeps ordinary days alive.",
        name: "Garden Journal",
        title: "Small days, tended until they begin to grow.",
        posts: [
          {
            excerpt:
              "A few sentences at the end of a day often feel closer to truth than a grand plan.",
            meta: "May 28",
            tag: "Journal",
            title: "The quiet advantage of writing after dinner",
          },
          {
            excerpt: "Books, roads, weather, and people meet one another in notes.",
            meta: "May 21",
            tag: "Reading",
            title: "Books, walks, and the space between them",
          },
          {
            excerpt: "A seasonal homepage lets memory live somewhere beyond a photo album.",
            meta: "May 12",
            tag: "Life",
            title: "Let a spring remain on the page",
          },
        ],
      },
      {
        author: "devlog.sh",
        id: "terminal-home",
        image: images.notes,
        kind: "terminal",
        label: "Dark, monospaced, like a public engineering log",
        line: "For technical writing, open-source projects, and research notes. It is as calm as a terminal, with human judgment in every line.",
        name: "Terminal Devlog",
        title: "Release notes, patches, research, and field reports.",
        posts: [
          {
            excerpt: "Refactor notes from a weekend release, and the judgment chain behind them.",
            meta: "r42",
            tag: "Patch",
            title: "Refactor notes from a weekend release",
          },
          {
            excerpt: "The things that broke after a runtime migration revealed the system shape.",
            meta: "r41",
            tag: "Research",
            title: "What broke when I moved the Worker runtime",
          },
          {
            excerpt: "Terminal aesthetics can still be readable for people who do not write code.",
            meta: "r40",
            tag: "Guide",
            title: "Designing a devlog that others can read",
          },
        ],
      },
    ] satisfies DemoHome[],
  };
}
