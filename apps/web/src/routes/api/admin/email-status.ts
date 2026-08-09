import { createFileRoute } from "@tanstack/react-router";

import { getAdvancedConfigStatus } from "#/lib/advanced-config-status";
import { jsonResponse } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { getEmailVerificationStatus } from "#/lib/email-verification";

export const Route = createFileRoute("/api/admin/email-status")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "site:read");

        if (accessError) {
          return accessError;
        }

        const [emailStatus, advancedConfig] = await Promise.all([
          getEmailVerificationStatus(),
          Promise.resolve(getAdvancedConfigStatus()),
        ]);

        return jsonResponse({ advanced: advancedConfig, data: emailStatus });
      },
    },
  },
});
