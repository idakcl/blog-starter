import { createFileRoute } from "@tanstack/react-router";

import { logoutAdmin } from "#/lib/admin-auth";
import { formRedirect } from "#/lib/auth-form";
import { jsonResponse } from "#/lib/cms-api";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const result = await logoutAdmin(request);

        if (acceptsHtml(request)) {
          return formRedirect("/login", { headers: result.headers });
        }

        return jsonResponse({ data: { signedOut: true } }, { headers: result.headers });
      },
    },
  },
});

function acceptsHtml(request: Request) {
  return (request.headers.get("accept") ?? "").toLowerCase().includes("text/html");
}
