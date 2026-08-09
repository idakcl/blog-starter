import { createFileRoute } from "@tanstack/react-router";

import { signupAccount } from "#/lib/account-auth";
import { redirectForRole } from "#/lib/account-routing";
import { formRedirect, isFormPost, readJsonOrFormBody } from "#/lib/auth-form";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/account/signup")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const formPost = isFormPost(request);
        const body = await readJsonOrFormBody<{
          email: string;
          name: string;
          password: string;
          redirectTo?: unknown;
        }>(request);
        const result = await signupAccount(body, request).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Signup failed",
        }));

        if ("error" in result) {
          if (formPost) {
            return formRedirect("/signup?error=1");
          }

          return jsonResponse({ error: result.error }, { status: 400 });
        }

        if ("verificationRequired" in result) {
          return jsonResponse({ data: null, verificationRequired: true }, { status: 202 });
        }

        if (formPost) {
          return formRedirect(redirectForRole(result.data, body.redirectTo), {
            headers: result.headers,
          });
        }

        return jsonResponse({ data: result.data }, { status: 201, headers: result.headers });
      },
    },
  },
});
