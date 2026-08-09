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
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
});

function AppLayout() {
  const locale = getCurrentLocale();
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    getSiteSettingsForLocale(locale),
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
