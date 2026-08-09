import { createFileRoute } from "@tanstack/react-router";

import { redirectToAccountSocialLogin } from "#/lib/account-auth";
import { formRedirect } from "#/lib/auth-form";

export const Route = createFileRoute("/api/account/login/$provider/start")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { provider: string }; request: Request }) => {
        if (params.provider !== "github" && params.provider !== "google") {
          return new Response("Not found", { status: 404 });
        }

        const result = await redirectToAccountSocialLogin(params.provider, request).catch(
          (error: unknown) => ({
            error: error instanceof Error ? error.message : "Login failed",
            headers: new Headers(),
          }),
        );

        if ("error" in result) {
          if ("status" in result && result.status === 503) {
            return Response.json({ error: result.error }, { status: result.status });
          }

          return formRedirect("/login?error=1", { headers: result.headers });
        }

        return formRedirect(result.data, { headers: result.headers, status: 302 });
      },
    },
  },
});
