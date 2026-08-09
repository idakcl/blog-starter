import { SiGithub } from "@icons-pack/react-simple-icons";
import { useAuth } from "@repo/auth/tanstack/hooks";
import { getSiteSettingsForLocale, type SiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BookOpenIcon,
  FileTextIcon,
  HomeIcon,
  Loader2Icon,
  SearchIcon,
  UserCircleIcon,
} from "lucide-react";
import { useEffect } from "react";

import { LanguageToggle } from "#/components/language-toggle";
import { siteBrandLinkClassName, SiteBrandText } from "#/components/site-brand";
import {
  resolveStylePreset,
  StylePresetCycleButton,
  StylePresetRuntimeScript,
  useStylePreset,
} from "#/components/style-preset-switcher";
import { ThemeToggle } from "#/components/theme-toggle";
import { getLocalizedDocsHref } from "#/lib/docs-i18n";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export function SiteShell({
  children,
  siteSettings: providedSiteSettings,
}: {
  readonly children: React.ReactNode;
  readonly siteSettings?: SiteSettings;
}) {
  const locale = getCurrentLocale();
  const siteSettings = providedSiteSettings ?? getSiteSettingsForLocale(locale);
  const settingsPreset = resolveStylePreset(siteSettings.themePreset, siteSettings.layoutPreset);
  const { preset, nextPreset, selectPreset } = useStylePreset(settingsPreset);
  const searchLabel = locale === "zh" ? "搜索" : "Search";
  const githubLink = siteSettings.socialLinks.find(isGitHubSocialLink);
  const footerSocialLinks = siteSettings.socialLinks.filter((link) => !isGitHubSocialLink(link));
  const navigation = getMarketingNavigation(siteSettings.navigation, locale);
  const creatorCreditLabel = locale === "zh" ? "创作者" : "Created by";
  const localizedNavigation = navigation.map((item) => ({
    ...item,
    href: getLocalizedDocsHref(item.href, locale),
  }));

  usePublicPageViewTracking();

  return (
    <div
      data-theme-preset={preset.themePreset}
      data-layout-preset={preset.layoutPreset}
      suppressHydrationWarning
      className="flex min-h-svh flex-col bg-background text-foreground"
    >
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/" className={siteBrandLinkClassName} aria-label={siteSettings.name}>
            <SiteBrandText name={siteSettings.name} />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {localizedNavigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-foreground transition hover:text-muted-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to="/blog"
              search={{ q: "", tag: "", series: "", page: 1 }}
              className="hidden h-9 min-w-28 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground lg:flex"
            >
              <SearchIcon className="size-4" />
              <span>{searchLabel}</span>
            </Link>
            <LanguageToggle currentLocale={locale} labelLocale={locale} />
            <StylePresetCycleButton
              locale={locale}
              nextPreset={nextPreset}
              onSelect={selectPreset}
              className="hidden md:inline-flex"
            />
            <ThemeToggle className="hidden md:inline-flex" />
            {githubLink ? <HeaderGitHubLink link={githubLink} /> : null}
            <HeaderAuthAction className="hidden md:inline-flex" />
          </div>
        </div>
      </header>
      <StylePresetRuntimeScript initialPreset={preset} locale={locale} />

      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileTabBar locale={locale} />

      <footer className="border-t border-border/80 bg-muted/45">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold">{siteSettings.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{siteSettings.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Powered by{" "}
              <a href="https://01mvp.com" className="font-semibold text-foreground hover:text-link">
                01mvp.com
              </a>
              <span aria-hidden="true"> · </span>
              {creatorCreditLabel}{" "}
              <a
                href="https://makerjackie.com"
                className="font-semibold text-foreground hover:text-link"
              >
                Jackie
              </a>
            </p>
          </div>
          {footerSocialLinks.length ? (
            <div className="flex flex-wrap items-center gap-3">
              {footerSocialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

type ShellNavigationItem = SiteSettings["navigation"][number];

const defaultMarketingNavigation: ShellNavigationItem[] = [
  { label: "Demo", href: "/demo", i18n: { label: { zh: "博客 Demo" } } },
  { label: "Docs", href: "/docs", i18n: { label: { zh: "文档" } } },
  { label: "Articles", href: "/blog", i18n: { label: { zh: "文章" } } },
  { label: "About", href: "/about", i18n: { label: { zh: "关于" } } },
];

function getMarketingNavigation(
  configuredNavigation: ShellNavigationItem[],
  locale: ReturnType<typeof getCurrentLocale>,
) {
  const navigation =
    configuredNavigation.length && !isLegacyStarterNavigation(configuredNavigation)
      ? configuredNavigation
      : defaultMarketingNavigation;

  return navigation.map((item) => ({
    ...item,
    label: item.i18n?.label?.[locale] ?? item.label,
  }));
}

function isLegacyStarterNavigation(navigation: ShellNavigationItem[]) {
  const legacyPaths = ["/blog", "/docs", "/series", "/tags", "/about"];

  return (
    navigation.length === legacyPaths.length &&
    legacyPaths.every((path, index) => navigation[index]?.href === path)
  );
}

function MobileTabBar({ locale }: { readonly locale: ReturnType<typeof getCurrentLocale> }) {
  const { user } = useAuth();
  const location = useLocation();
  const docsHref = getLocalizedDocsHref("/docs", locale);
  const items = [
    {
      href: "/",
      label: locale === "zh" ? "首页" : "Home",
      icon: HomeIcon,
    },
    {
      href: "/demo",
      label: locale === "zh" ? "Demo" : "Demo",
      icon: BookOpenIcon,
    },
    {
      href: docsHref,
      label: locale === "zh" ? "文档" : "Docs",
      icon: FileTextIcon,
    },
    {
      href: "/blog",
      label: locale === "zh" ? "文章" : "Articles",
      icon: SearchIcon,
    },
    {
      href: user ? "/app" : "/login",
      label: user ? m.account_title() : m.login(),
      icon: UserCircleIcon,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActiveMobilePath(location.pathname, item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] leading-none font-semibold text-muted-foreground transition",
                active && "bg-foreground text-background",
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function isActiveMobilePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

let lastTrackedPageViewKey = "";

function usePublicPageViewTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const path = `${location.pathname}${location.searchStr ?? ""}`;

    if (!shouldTrackPublicPath(path) || path === lastTrackedPageViewKey) {
      return;
    }

    lastTrackedPageViewKey = path;

    const payload = JSON.stringify({
      path,
      postSlug: getTrackedPostSlug(location.pathname),
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([payload], { type: "application/json" }),
      );

      if (sent) {
        return;
      }
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [location.pathname, location.searchStr]);
}

function shouldTrackPublicPath(path: string) {
  const pathname = path.split("?")[0];

  return (
    pathname !== "/login" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/uploads")
  );
}

function getTrackedPostSlug(pathname: string) {
  const match = /^\/blog\/([^/?#]+)/.exec(pathname);

  return match ? decodeURIComponent(match[1]) : null;
}

type SocialLink = SiteSettings["socialLinks"][number];

function isGitHubSocialLink(link: SocialLink) {
  return link.label.trim().toLowerCase() === "github" || link.href.includes("github.com");
}

function HeaderGitHubLink({ link }: { readonly link: SocialLink }) {
  return (
    <Button
      render={<a href={link.href} aria-label={m.github_repository()} />}
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      aria-label={m.github_repository()}
      title={link.label}
      className="hidden md:inline-flex"
    >
      <SiGithub className="size-4" />
      <span className="sr-only">{link.label}</span>
    </Button>
  );
}

function HeaderAuthAction({ className }: { readonly className?: string }) {
  const { user, isPending } = useAuth();

  if (isPending) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className={cn("min-w-14", className)}
        aria-label={m.login()}
      >
        <Loader2Icon className="animate-spin" />
      </Button>
    );
  }

  if (user) {
    return (
      <Button
        render={<Link to="/app" />}
        variant="outline"
        size="sm"
        nativeButton={false}
        className={cn("min-w-14 px-3 font-semibold", className)}
        aria-label={m.account_title()}
      >
        {m.account_title()}
      </Button>
    );
  }

  return (
    <Button
      render={<Link to="/login" />}
      variant="outline"
      size="sm"
      nativeButton={false}
      className={cn("min-w-14 px-3 font-semibold", className)}
      aria-label={m.login()}
    >
      {m.login()}
    </Button>
  );
}
