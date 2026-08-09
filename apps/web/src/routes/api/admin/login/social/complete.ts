import { createFileRoute } from "@tanstack/react-router";

import { completeAdminSocialLogin } from "#/lib/admin-auth";
import { formRedirect } from "#/lib/auth-form";

export const Route = createFileRoute("/api/admin/login/social/complete")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const result = await completeAdminSocialLogin(request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Login failed",
          headers: new Headers(),
        }));

        if ("error" in result) {
          return formRedirect("/login?error=1", { headers: result.headers });
        }

        return formRedirect(result.data, { headers: result.headers });
      },
    },
  },
});
