import { createFileRoute } from "@tanstack/react-router";

import { loginAdmin, publicAdminUser } from "#/lib/admin-auth";
import { formRedirect, isFormPost, readJsonOrFormBody } from "#/lib/auth-form";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const formPost = isFormPost(request);
        const body = await readJsonOrFormBody<{ email: string; password: string }>(request);
        const result = await loginAdmin(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Login failed",
        }));

        if ("error" in result) {
          if (formPost) {
            return formRedirect("/login?error=1");
          }

          return jsonResponse({ error: result.error }, { status: 401 });
        }

        if (formPost) {
          return formRedirect("/admin", { headers: result.headers });
        }

        return jsonResponse({ data: publicAdminUser(result.data) }, { headers: result.headers });
      },
    },
  },
});
