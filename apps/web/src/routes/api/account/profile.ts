import { createFileRoute } from "@tanstack/react-router";

import { getAccountUserFromRequest } from "#/lib/account-auth";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { updateCmsUser } from "#/lib/cms-users";

export const Route = createFileRoute("/api/account/profile")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        const user = await getAccountUserFromRequest(request, {
          disableCookieCache: true,
        });

        if (!user) {
          return jsonResponse({ error: "Authentication required" }, { status: 401 });
        }

        const body = await readJsonBody<{ name?: unknown }>(request);
        const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";

        if (!name) {
          return jsonResponse({ error: "Name is required" }, { status: 400 });
        }

        if (name.length > 80) {
          return jsonResponse({ error: "Name must be 80 characters or fewer" }, { status: 400 });
        }

        const updated = await updateCmsUser(user.id, { name });

        return jsonResponse({ data: updated ?? user });
      },
    },
  },
});
