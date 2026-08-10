import { createFileRoute } from "@tanstack/react-router";

import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { getD1SiteSettings, updateD1SiteSettings } from "#/lib/cms-d1";
import { getEmailDeliveryStatus } from "#/lib/cms-email";

export const Route = createFileRoute("/api/site")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "site:read");

        if (accessError) {
          return accessError;
        }

        // 编辑场景（如后台设置表单）需要规范的存储值，不应被 localizeSiteSettings
        // 本地化（否则会显示过期的逐语言覆盖，或把中文导航标签翻成英文导致保存时丢失）。
        // 传入 ?raw 时返回未本地化的规范设置；其余场景按请求语言本地化显示。
        const raw = new URL(request.url).searchParams.has("raw");
        const data = raw
          ? await getD1SiteSettings()
          : await getD1SiteSettings(getApiLocale(request));

        return jsonResponse({
          data,
          requiredScope: "site:read",
        });
      },
      PUT: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "site:write");

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<Parameters<typeof updateD1SiteSettings>[0]>(request);

        const emailDelivery = getEmailDeliveryStatus();

        if (body.emailVerificationEnabled === true && !emailDelivery.configured) {
          return jsonResponse(
            {
              error:
                "Configure Cloudflare Email Sending or Resend before enabling email verification.",
            },
            { status: 400 },
          );
        }

        if (
          (body.emailNotificationsEnabled === true || body.manualEmailBroadcastsEnabled === true) &&
          !emailDelivery.configured
        ) {
          return jsonResponse(
            {
              error:
                "Configure Cloudflare Email Sending or Resend before enabling optional email notifications.",
            },
            { status: 400 },
          );
        }

        return jsonResponse({
          data: await updateD1SiteSettings(body),
          requiredScope: "site:write",
        });
      },
    },
  },
});
