import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { localizeSiteSettings } from "@repo/core";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SiteShell } from "#/components/site-shell";
import { redirectForRole, safeAccountRedirectPath } from "#/lib/account-routing";
import { $getSiteSettings } from "#/lib/cms-server";
import { getCurrentLocale } from "#/lib/i18n";
import { getServerAuthUser } from "#/lib/route-auth";

export const Route = createFileRoute("/_guest")({
  validateSearch: (search): { redirectTo?: string } => {
    const redirectTo = safeAccountRedirectPath(search.redirectTo);

    return redirectTo === "/app" ? {} : { redirectTo };
  },
  component: RouteComponent,
  beforeLoad: async ({ context, search }) => {
    // Redirect path when user is already present,
    // or after successful login/signup
    const REDIRECT_URL = safeAccountRedirectPath(search.redirectTo);
    const locale = getCurrentLocale();
    // 用数据库里的真实站点设置（含已配置的主题），而不是种子默认值。
    const siteSettings = localizeSiteSettings(await $getSiteSettings(), locale);
    const serverUser = await getServerAuthUser();

    if (serverUser !== undefined) {
      if (serverUser) {
        throw redirect({
          to: redirectForRole(serverUser, REDIRECT_URL),
        });
      }

      return {
        redirectUrl: REDIRECT_URL,
        siteSettings,
      };
    }

    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });
    if (user) {
      throw redirect({
        to: redirectForRole(user, REDIRECT_URL),
      });
    }

    return {
      redirectUrl: REDIRECT_URL,
      siteSettings,
    };
  },
});

function RouteComponent() {
  const { siteSettings } = Route.useRouteContext();

  return (
    <SiteShell siteSettings={siteSettings}>
      <div className="flex min-h-[calc(100svh-8.5rem)] flex-col items-center justify-center gap-6 bg-background px-6 py-6 md:min-h-[calc(100svh-3.5rem)] md:px-10 md:py-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </SiteShell>
  );
}
