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

        return jsonResponse({
          data: await getD1SiteSettings(getApiLocale(request)),
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
