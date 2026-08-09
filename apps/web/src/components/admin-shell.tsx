import type { AuthQueryResult } from "@repo/auth/tanstack/queries";
import { getSiteSettingsForLocale, type SiteSettings } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Link, Outlet } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  FileTextIcon,
  ImageIcon,
  LibraryIcon,
  LockKeyholeIcon,
  MessageSquareIcon,
  SettingsIcon,
  SquareLibraryIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "#/components/language-toggle";
import { SignOutButton } from "#/components/sign-out-button";
import { siteBrandLinkClassName, SiteBrandText } from "#/components/site-brand";
import {
  resolveStylePreset,
  type StylePresetOption,
  StylePresetCycleButton,
  StylePresetRuntimeScript,
  useStylePreset,
} from "#/components/style-preset-switcher";
import { ThemeToggle } from "#/components/theme-toggle";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

const adminNav = [
  { label: m.admin_nav_overview, href: "/admin", icon: SquareLibraryIcon },
  { label: m.admin_nav_posts, href: "/admin/posts", icon: FileTextIcon },
  { label: m.admin_nav_series, href: "/admin/series", icon: LibraryIcon },
  { label: m.admin_nav_assets, href: "/admin/assets", icon: ImageIcon },
  { label: m.admin_nav_comments, href: "/admin/comments", icon: MessageSquareIcon },
  { label: m.admin_nav_users, href: "/admin/users", icon: UsersIcon },
  { label: m.admin_nav_settings, href: "/admin/settings", icon: SettingsIcon },
];

export function AdminShell({ user }: { readonly user: AuthQueryResult }) {
  const locale = getCurrentLocale();
  const isAdmin = user?.role === "admin";
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getSiteSettingsForLocale(locale));
  const settingsPreset = resolveStylePreset(siteSettings.themePreset, siteSettings.layoutPreset);
  const { preset, nextPreset, selectPreset, resetPreset } = useStylePreset(settingsPreset);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;
    const handleSettingsUpdate = (event: Event) => {
      const nextSettings = (event as CustomEvent<SiteSettings>).detail;

      if (nextSettings) {
        resetPreset();
        setSiteSettings(nextSettings);
      }
    };

    void fetch(`/api/site?lang=${locale}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        const data = (payload as { data?: SiteSettings } | undefined)?.data;

        if (!ignore && data) {
          setSiteSettings(data);
        }
      });

    window.addEventListener("blogcms:site-settings-updated", handleSettingsUpdate);

    return () => {
      ignore = true;
      window.removeEventListener("blogcms:site-settings-updated", handleSettingsUpdate);
    };
  }, [isAdmin, locale, resetPreset]);

  if (!isAdmin) {
    return <AdminAccessDenied locale={locale} siteName={siteSettings.name} />;
  }

  return (
    <div
      data-theme-preset={preset.themePreset}
      data-layout-preset={preset.layoutPreset}
      suppressHydrationWarning
      className="min-h-svh bg-background text-foreground lg:pl-72"
    >
      <DesktopSidebar
        locale={locale}
        nextPreset={nextPreset}
        onPresetSelect={selectPreset}
        siteName={siteSettings.name}
      />
      <MobileAdminHeader
        locale={locale}
        nextPreset={nextPreset}
        onPresetSelect={selectPreset}
        siteName={siteSettings.name}
      />
      <StylePresetRuntimeScript initialPreset={preset} locale={locale} />

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminAccessDenied({
  locale,
  siteName,
}: {
  readonly locale: ReturnType<typeof getCurrentLocale>;
  readonly siteName: string;
}) {
  const copy = getAccessDeniedCopy(locale);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className={siteBrandLinkClassName} title={siteName}>
            <SiteBrandText name={siteName} />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-md border bg-card p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <LockKeyholeIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {copy.eyebrow}
              </p>
              <h1 className="mt-1 text-xl font-semibold">{copy.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button render={<Link to="/app" />} nativeButton={false} className="w-full sm:w-auto">
              <ArrowLeftIcon className="size-4" />
              {copy.accountAction}
            </Button>
            <Button
              render={<Link to="/" />}
              variant="outline"
              nativeButton={false}
              className="w-full sm:w-auto"
            >
              {copy.homeAction}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function getAccessDeniedCopy(locale: ReturnType<typeof getCurrentLocale>) {
  if (locale === "zh") {
    return {
      accountAction: "回到账号中心",
      description: "当前账号没有后台权限。管理员可以在账号中心进入后台。",
      eyebrow: "无权限",
      homeAction: "返回首页",
      title: "无法访问后台",
    };
  }

  return {
    accountAction: "Back to account",
    description:
      "This account does not have admin access. Admin users can open the admin area from the account center.",
    eyebrow: "No access",
    homeAction: "Back to home",
    title: "Admin area unavailable",
  };
}

function DesktopSidebar({
  locale,
  nextPreset,
  onPresetSelect,
  siteName,
}: {
  readonly locale: ReturnType<typeof getCurrentLocale>;
  readonly nextPreset: StylePresetOption;
  readonly onPresetSelect: (preset: StylePresetOption) => void;
  readonly siteName: string;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="border-b border-sidebar-border px-5 py-4">
        <Link to="/" className={cn(siteBrandLinkClassName, "block")} title={siteName}>
          <SiteBrandText name={siteName} />
        </Link>
        <div className="mt-3 flex items-center gap-1">
          <LanguageToggle />
          <StylePresetCycleButton
            locale={locale}
            nextPreset={nextPreset}
            onSelect={onPresetSelect}
          />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        <AdminNavItems />

        <div className="mt-auto border-t border-sidebar-border pt-4">
          <SignOutButton className="w-full justify-center" />
        </div>
      </div>
    </aside>
  );
}

function MobileAdminHeader({
  locale,
  nextPreset,
  onPresetSelect,
  siteName,
}: {
  readonly locale: ReturnType<typeof getCurrentLocale>;
  readonly nextPreset: StylePresetOption;
  readonly onPresetSelect: (preset: StylePresetOption) => void;
  readonly siteName: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl lg:hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4">
        <Link to="/" className={siteBrandLinkClassName} title={siteName}>
          <SiteBrandText name={siteName} />
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageToggle />
          <StylePresetCycleButton
            locale={locale}
            nextPreset={nextPreset}
            onSelect={onPresetSelect}
          />
          <ThemeToggle />
        </div>
      </div>
      <div className="overflow-x-auto border-t border-sidebar-border px-3 py-2">
        <AdminNavItems compact />
      </div>
    </header>
  );
}

function AdminNavItems({ compact = false }: { readonly compact?: boolean }) {
  return (
    <nav className={cn("grid gap-1", compact && "flex min-w-max")}>
      {adminNav.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.href}
            render={
              <Link
                to={item.href}
                activeOptions={{ exact: item.href === "/admin" }}
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
                inactiveProps={{
                  className:
                    "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                }}
              />
            }
            variant="ghost"
            size={compact ? "sm" : "default"}
            nativeButton={false}
            className={cn("justify-start rounded-md px-3", compact ? "h-9 w-auto" : "h-10 w-full")}
          >
            <Icon className="size-4" />
            <span>{item.label()}</span>
          </Button>
        );
      })}
    </nav>
  );
}
