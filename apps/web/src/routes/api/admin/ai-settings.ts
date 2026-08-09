import { createFileRoute } from "@tanstack/react-router";

import {
  getAiProviderConfigView,
  testAiProviderConnection,
  updateAiProviderConfig,
  type AiProviderConfigInput,
} from "#/lib/ai-provider.server";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";

export const Route = createFileRoute("/api/admin/ai-settings")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        return jsonResponse({
          data: await getAiProviderConfigView(),
          requiredScope: "site:read",
        });
      },
      PUT: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const input = await readJsonBody<AiProviderConfigInput>(request);
        const data = await updateAiProviderConfig(input);

        return jsonResponse({
          data,
          requiredScope: "site:write",
        });
      },
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
