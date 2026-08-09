import { createFileRoute } from "@tanstack/react-router";

import { loginAccount } from "#/lib/account-auth";
import { redirectForRole } from "#/lib/account-routing";
import { formRedirect, isFormPost, readJsonOrFormBody } from "#/lib/auth-form";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/account/login")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const formPost = isFormPost(request);
        const body = await readJsonOrFormBody<{
          email: string;
          password: string;
          redirectTo?: unknown;
        }>(request);
        const result = await loginAccount(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Login failed",
        }));

        if ("error" in result) {
          if (formPost) {
            return formRedirect("/login?error=1");
          }

          return jsonResponse({ error: result.error }, { status: 401 });
        }

        if (formPost) {
          return formRedirect(redirectForRole(result.data, body.redirectTo), {
            headers: result.headers,
          });
        }

        return jsonResponse({ data: result.data }, { headers: result.headers });
      },
    },
  },
});
