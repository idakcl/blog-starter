import { createFileRoute } from "@tanstack/react-router";

import { changeAccountPassword } from "#/lib/account-security";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";

export const Route = createFileRoute("/api/account/password")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const body = await readJsonBody<{
          currentPassword?: string;
          newPassword?: string;
        }>(request);
        const result = await changeAccountPassword(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Password could not be changed.",
          status: 400,
        }));

        if ("error" in result) {
          const status = "status" in result ? result.status : 400;

          return jsonResponse({ error: result.error }, { status });
        }

        const headers = "headers" in result ? result.headers : undefined;

        return jsonResponse({ data: result.data }, { headers });
      },
    },
  },
});
