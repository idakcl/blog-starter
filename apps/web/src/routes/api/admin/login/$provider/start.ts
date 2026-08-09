import { createFileRoute } from "@tanstack/react-router";

import { redirectToAdminSocialLogin } from "#/lib/admin-auth";
import { formRedirect } from "#/lib/auth-form";

export const Route = createFileRoute("/api/admin/login/$provider/start")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { provider: string }; request: Request }) => {
        if (params.provider !== "github" && params.provider !== "google") {
          return formRedirect("/login?error=1");
        }

        const result = await redirectToAdminSocialLogin(params.provider, request).catch(
          (error: unknown) => ({
            error: error instanceof Error ? error.message : "Login failed",
          }),
        );

        if ("error" in result) {
          return formRedirect("/login?error=1", {
            headers: "headers" in result ? result.headers : undefined,
          });
        }

        return formRedirect(result.data, { headers: result.headers, status: 302 });
      },
    },
  },
});
