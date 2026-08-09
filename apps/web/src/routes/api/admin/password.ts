import { createFileRoute } from "@tanstack/react-router";

import { publicAdminUser, resetAdminPassword } from "#/lib/admin-auth";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";

export const Route = createFileRoute("/api/admin/password")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const body = await readJsonBody<{ email: string; password: string }>(request);
        const result = await resetAdminPassword(body.email, body.password).catch(
          (error: unknown) => ({
            error: error instanceof Error ? error.message : "Password could not be reset",
          }),
        );

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 400 });
        }

        return jsonResponse({ data: publicAdminUser(result.data) });
      },
    },
  },
});
