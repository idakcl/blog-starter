import type { AuthQueryResult } from "@repo/auth/tanstack/queries";
import { getSiteSettingsForLocale } from "@repo/core";
import { Toaster } from "@repo/ui/components/sonner";
import { getThemeScript, ThemeProvider } from "@repo/ui/lib/theme-provider";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";

import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

import appCss from "#/styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  user: AuthQueryResult;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // Protected routes load the user in /_auth/route.tsx.
  // Public auth affordances use the shared auth query without blocking SSR.
  head: () => {
    const siteSettings = getSiteSettingsForLocale(getCurrentLocale());

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: siteSettings.name,
        },
        {
          name: "description",
          content: siteSettings.description,
        },
        {
          property: "og:title",
          content: siteSettings.name,
        },
        {
          property: "og:description",
          content: siteSettings.description,
        },
        {
          property: "og:image",
          content: "/og-default.svg",
        },
        {
          name: "theme-color",
          content: "#FAF8F2",
        },
        {
          name: "application-name",
          content: siteSettings.name,
        },
        {
          name: "apple-mobile-web-app-title",
          content: siteSettings.name,
        },
        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },
        {
          name: "mobile-web-app-capable",
          content: "yes",
        },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "default",
        },
        {
          name: "msapplication-TileColor",
          content: "#2C261F",
        },
        {
          name: "msapplication-config",
          content: "/browserconfig.xml",
        },
      ],
      links: [
        {
          rel: "icon",
          href: "/favicon.ico",
          sizes: "any",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "manifest",
          type: "application/manifest+json",
          href: "/manifest.webmanifest",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "mask-icon",
          href: "/safari-pinned-tab.svg",
          color: "#2C261F",
        },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: m.rss_feed(),
          href: "/rss.xml",
        },
        { rel: "stylesheet", href: appCss },
      ],
    };
  },
  shellComponent: RootDocument,
});

function DevToolsWrapper() {
  const [devtools, setDevtools] = useState<React.ReactNode>(null);
  const loadedRef = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      const [
        { TanStackDevtools },
        { ReactQueryDevtoolsPanel },
        { TanStackRouterDevtoolsPanel },
        { formDevtoolsPlugin },
        { a11yDevtoolsPlugin },
      ] = await Promise.all([
        import("@tanstack/react-devtools"),
        import("@tanstack/react-query-devtools"),
        import("@tanstack/react-router-devtools"),
        import("@tanstack/react-form-devtools"),
        import("@tanstack/devtools-a11y/react"),
      ]);

      startTransition(() =>
        setDevtools(
          <TanStackDevtools
            plugins={[
              {
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              formDevtoolsPlugin(),
              a11yDevtoolsPlugin(),
            ]}
          />,
        ),
      );
    })();
  }, []);

  return devtools;
}

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  const locale = getCurrentLocale();

  return (
    // suppress since we're updating the "dark" class in ThemeProvider
    <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>{getThemeScript("theme", "system")}</ScriptOnce>
        <ThemeProvider>
          {children}
          <Toaster richColors />
        </ThemeProvider>

        {import.meta.env.DEV ? <DevToolsWrapper /> : null}

        <Scripts />
      </body>
    </html>
  );
}
