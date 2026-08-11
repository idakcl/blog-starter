import { localizeSiteSettings } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "#/components/admin-shell";
import { $getSiteSettings } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminRoute,
  loader: async () => {
    const locale = getCurrentLocale();
    const siteSettings = localizeSiteSettings(await $getSiteSettings(), locale);

    return { siteSettings };
  },
});

function AdminRoute() {
  const { user } = Route.useRouteContext();
  const { siteSettings } = Route.useLoaderData();

  return <AdminShell initialSiteSettings={siteSettings} user={user} />;
}
