import { SiGithub } from "@icons-pack/react-simple-icons";
import { useAuth } from "@repo/auth/tanstack/hooks";
import { getSiteSettingsForLocale, type SiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  type LucideIcon,
  FileTextIcon,
  HomeIcon,
  InfoIcon,
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
  showBrand = true,
}: {
  readonly children: React.ReactNode;
  readonly siteSettings?: SiteSettings;
  readonly showBrand?: boolean;
}) {
  const locale = getCurrentLocale();
  const siteSettings = providedSiteSettings ?? getSiteSettingsForLocale(locale);
  const settingsPreset = resolveStylePreset(siteSettings.themePreset, siteSettings.layoutPreset);
  const { preset, nextPreset, selectPreset } = useStylePreset(settingsPreset);
  const searchLabel = locale === "zh" ? "搜索" : "Search";
  const githubLink = siteSettings.socialLinks.find(isGitHubSocialLink);
  const { user } = useAuth();
  const location = useLocation();
  const shellNavItems = getShellNavItems(siteSettings, locale, user);

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
          {showBrand ? (
            <Link to="/" className={siteBrandLinkClassName} aria-label={siteSettings.name}>
              <SiteBrandText
                avatarUrl={siteSettings.avatarUrl}
                description={siteSettings.description}
                name={siteSettings.name}
              />
            </Link>
          ) : null}

          <nav className="hidden items-center gap-1 md:flex">
            {shellNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveMobilePath(location.pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
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
          </div>
        </div>
      </header>
      <StylePresetRuntimeScript initialPreset={preset} locale={locale} />

      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <MobileTabBar items={shellNavItems} location={location} />
    </div>
  );
}

type ShellNavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

function getShellNavItems(
  siteSettings: SiteSettings,
  locale: ReturnType<typeof getCurrentLocale>,
  user: { id?: string } | null | undefined,
): ShellNavItem[] {
  const docsHref = getLocalizedDocsHref("/docs", locale);
  const items: ShellNavItem[] = [
    { href: "/", label: locale === "zh" ? "首页" : "Home", icon: HomeIcon },
    { href: "/blog", label: locale === "zh" ? "文章" : "Articles", icon: SearchIcon },
    { href: "/about", label: locale === "zh" ? "关于" : "About", icon: InfoIcon },
  ];

  if (siteSettings.showDocsNav !== false) {
    items.push({ href: docsHref, label: locale === "zh" ? "文档" : "Docs", icon: FileTextIcon });
  }

  items.push({
    href: user ? "/app" : "/login",
    label: user ? m.account_title() : m.login(),
    icon: UserCircleIcon,
  });

  return items;
}

function MobileTabBar({
  items,
  location,
}: {
  readonly items: ShellNavItem[];
  readonly location: ReturnType<typeof useLocation>;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
      <div
        className={cn(
          "mx-auto grid max-w-md gap-1",
          items.length === 5 ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActiveMobilePath(location.pathname, item.href);

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] leading-none font-medium transition-colors",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
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
