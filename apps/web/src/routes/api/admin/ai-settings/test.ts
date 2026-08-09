import { createFileRoute } from "@tanstack/react-router";

import { testAiProviderConnection, type AiProviderConfigInput } from "#/lib/ai-provider.server";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";

export const Route = createFileRoute("/api/admin/ai-settings/test")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const input = await readJsonBody<AiProviderConfigInput>(request);
        const result = await testAiProviderConnection(input);

        if (!result.ok) {
          return jsonResponse({ error: result.error }, { status: result.status ?? 400 });
        }

        return jsonResponse({ data: { ok: true }, requiredScope: "site:write" });
      },
    },
  },
});
