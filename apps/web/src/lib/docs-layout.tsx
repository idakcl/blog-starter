import { SiGithub } from "@icons-pack/react-simple-icons";
import type { SiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import FumadocsLink from "fumadocs-core/link";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import { RssIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { LanguageToggle } from "#/components/language-toggle";
import { siteBrandLinkClassName, SiteBrandText } from "#/components/site-brand";
import { StylePresetCycleButton, type StylePresetOption } from "#/components/style-preset-switcher";
import { ThemeToggle } from "#/components/theme-toggle";
import { getDocsUrl, type DocsLocale } from "#/lib/docs-i18n";
import { setCurrentLocale } from "#/lib/i18n";

type DocsLayoutConfig = Omit<DocsLayoutProps, "children" | "tree">;

interface DocsLayoutOptions {
  locale: DocsLocale;
  nextPreset: StylePresetOption;
  onPresetSelect: (preset: StylePresetOption) => void;
  siteSettings: SiteSettings;
  slugs: string[];
}

const docsSidebarControlClassName =
  "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground size-8 shrink-0 rounded-md";

const githubRepositoryUrl = "https://github.com/01mvp/blog-starter";

function DocsSidebarControls({
  locale,
  nextPreset,
  onPresetSelect,
  rssLink,
  slugs,
}: {
  readonly locale: DocsLocale;
  readonly nextPreset: StylePresetOption;
  readonly onPresetSelect: (preset: StylePresetOption) => void;
  readonly rssLink?: { href: string; label: string };
  readonly slugs: string[];
}) {
  const githubRepositoryLabel = locale === "zh" ? "GitHub 仓库" : "GitHub repository";

  function handleLocaleChange(nextLocale: DocsLocale) {
    void Promise.resolve(setCurrentLocale(nextLocale, { reload: false })).finally(() => {
      window.location.href = getDocsUrl(slugs, nextLocale);
    });
  }

  return (
    <div
      data-docs-sidebar-controls=""
      className="text-fd-muted-foreground flex flex-nowrap items-center gap-1.5 pt-2"
    >
      <Button
        render={<FumadocsLink href={githubRepositoryUrl} />}
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        aria-label={githubRepositoryLabel}
        title={githubRepositoryLabel}
        className={cn(docsSidebarControlClassName)}
      >
        <SiGithub className="size-4" />
        <span className="sr-only">{githubRepositoryLabel}</span>
      </Button>
      {rssLink ? (
        <Button
          render={<FumadocsLink href={rssLink.href} />}
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          aria-label={rssLink.label}
          title={rssLink.label}
          className={cn(docsSidebarControlClassName)}
        >
          <RssIcon className="size-4" />
          <span className="sr-only">{rssLink.label}</span>
        </Button>
      ) : null}
      <StylePresetCycleButton
        className={docsSidebarControlClassName}
        locale={locale}
        nextPreset={nextPreset}
        onSelect={onPresetSelect}
      />
      <ThemeToggle locale={locale} className={docsSidebarControlClassName} />
      <LanguageToggle
        currentLocale={locale}
        labelLocale={locale}
        onLocaleChange={handleLocaleChange}
        className={docsSidebarControlClassName}
      />
    </div>
  );
}

export function getDocsLayoutOptions({
  locale,
  nextPreset,
  onPresetSelect,
  siteSettings,
  slugs,
}: DocsLayoutOptions): DocsLayoutConfig {
  const rssLink = getRssLink(siteSettings, locale);

  return {
    i18n: false,
    nav: {
      title: ({ className, href = "/", ...props }: ComponentProps<"a">) => (
        <FumadocsLink
          href={href}
          {...props}
          className={cn(siteBrandLinkClassName, "inline-flex max-w-full items-center", className)}
        >
          <SiteBrandText name={siteSettings.name} />
        </FumadocsLink>
      ),
      url: "/",
    },
    sidebar: {
      footer: (
        <DocsSidebarControls
          locale={locale}
          nextPreset={nextPreset}
          onPresetSelect={onPresetSelect}
          rssLink={rssLink}
          slugs={slugs}
        />
      ),
    },
    themeSwitch: {
      enabled: false,
    },
  };
}

function getRssLink(siteSettings: SiteSettings, locale: DocsLocale) {
  if (!siteSettings.rssEnabled) return undefined;

  const configuredLink = siteSettings.socialLinks.find(
    (link) => link.href === "/rss.xml" || link.label.trim().toLowerCase() === "rss",
  );

  return {
    href: configuredLink?.href ?? "/rss.xml",
    label: configuredLink?.label ?? (locale === "zh" ? "RSS 订阅" : "RSS feed"),
  };
}
