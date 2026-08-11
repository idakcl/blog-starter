import { getSiteSettingsForLocale, localizeSiteSettings, type SiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { HomeIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "#/components/language-toggle";
import { SignOutButton } from "#/components/sign-out-button";
import {
  resolveStylePreset,
  StylePresetCycleButton,
  StylePresetRuntimeScript,
  useStylePreset,
} from "#/components/style-preset-switcher";
import { ThemeToggle } from "#/components/theme-toggle";
import { $getSiteSettings } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
  // 登录后客户端导航落到 /app（账号中心）时，直接用 loader 注入的真实站点设置作为
  // 初始值。否则首帧会使用种子默认主题（maker / 白），再经 useEffect 的 fetch 切换
  // 到真实主题，导致登录后到达后台第一帧闪现一次白色主题。
  loader: async () => {
    const locale = getCurrentLocale();
    const siteSettings = localizeSiteSettings(await $getSiteSettings(), locale);

    return { siteSettings };
  },
});

function AppLayout() {
  const locale = getCurrentLocale();
  const { siteSettings: initialSiteSettings } = Route.useLoaderData();
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    () => initialSiteSettings ?? getSiteSettingsForLocale(locale),
  );
  const settingsPreset = resolveStylePreset(siteSettings.themePreset, siteSettings.layoutPreset);
  const { preset, nextPreset, selectPreset } = useStylePreset(settingsPreset);

  useEffect(() => {
    let ignore = false;

    void fetch(`/api/site?lang=${locale}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        const data = (payload as { data?: SiteSettings } | undefined)?.data;

        if (!ignore && data) {
          setSiteSettings(localizeSiteSettings(data, locale));
        }
      });

    return () => {
      ignore = true;
    };
  }, [locale]);

  return (
    <div
      data-theme-preset={preset.themePreset}
      data-layout-preset={preset.layoutPreset}
      suppressHydrationWarning
      className="min-h-svh bg-muted/20 text-foreground"
    >
      <StylePresetRuntimeScript initialPreset={preset} locale={locale} />
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Button render={<Link to="/" />} variant="ghost" size="sm" nativeButton={false}>
            <HomeIcon className="size-4" />
            {m.back_home()}
          </Button>

          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <StylePresetCycleButton
              locale={locale}
              nextPreset={nextPreset}
              onSelect={selectPreset}
            />
            <ThemeToggle />
            <SignOutButton className="hidden sm:block" buttonClassName="px-3" size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <Outlet />
      </main>

      <div className="mx-auto w-full max-w-5xl px-4 pb-6 sm:hidden">
        <SignOutButton className="w-full" buttonClassName="w-full" size="default" />
      </div>
    </div>
  );
}
