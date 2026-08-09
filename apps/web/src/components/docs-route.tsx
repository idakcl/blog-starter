import type { SiteSettings } from "@repo/core";
import browserCollections from "collections/browser";
import type { Root } from "fumadocs-core/page-tree";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { I18nProvider } from "fumadocs-ui/contexts/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { RootProvider as FumadocsRootProvider } from "fumadocs-ui/provider/tanstack";
import { Suspense, useEffect } from "react";

import { DocsMDXProvider, useMDXComponents } from "#/components/mdx";
import {
  resolveStylePreset,
  StylePresetRuntimeScript,
  useStylePreset,
} from "#/components/style-preset-switcher";
import { getDocsI18nProvider, getDocsUrl } from "#/lib/docs-i18n";
import { getDocsLayoutOptions } from "#/lib/docs-layout";
import { setCurrentLocale } from "#/lib/i18n";

export const docsClientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }) {
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

interface DocsRouteData {
  locale: "en" | "zh";
  pageTree: Root;
  path: string;
  siteSettings: SiteSettings;
  slugs: string[];
}

export function DocsRouteView({ data }: { readonly data: DocsRouteData }) {
  const loaderData = useFumadocsLoader(data);
  const settingsPreset = resolveStylePreset(
    data.siteSettings.themePreset,
    data.siteSettings.layoutPreset,
  );
  const { preset, nextPreset, selectPreset } = useStylePreset(settingsPreset);

  useEffect(() => {
    void setCurrentLocale(data.locale, { reload: false });
  }, [data.locale]);

  return (
    <div
      data-docs-surface=""
      data-theme-preset={preset.themePreset}
      data-layout-preset={preset.layoutPreset}
      suppressHydrationWarning
      className="min-h-svh bg-background text-foreground"
    >
      <StylePresetRuntimeScript initialPreset={preset} locale={data.locale} />
      <FumadocsRootProvider theme={{ enabled: false }}>
        <DocsMDXProvider locale={data.locale} slugs={data.slugs}>
          <I18nProvider
            {...getDocsI18nProvider(data.locale)}
            onLocaleChange={(locale) => {
              const nextLocale = locale === "zh" ? "zh" : "en";

              void Promise.resolve(setCurrentLocale(nextLocale, { reload: false })).finally(() => {
                window.location.href = getDocsUrl(data.slugs, nextLocale);
              });
            }}
          >
            <DocsLayout
              {...getDocsLayoutOptions({
                locale: data.locale,
                nextPreset,
                onPresetSelect: selectPreset,
                siteSettings: data.siteSettings,
                slugs: data.slugs,
              })}
              tree={loaderData.pageTree}
            >
              <Suspense>{docsClientLoader.useContent(data.path)}</Suspense>
            </DocsLayout>
          </I18nProvider>
        </DocsMDXProvider>
      </FumadocsRootProvider>
    </div>
  );
}
