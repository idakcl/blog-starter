import { createFileRoute } from "@tanstack/react-router";

import {
  countAdminUsers,
  createAdminUser,
  getAdminUserFromRequest,
  loginAdmin,
  publicAdminUser,
} from "#/lib/admin-auth";
import { formRedirect, isFormPost, readJsonOrFormBody } from "#/lib/auth-form";
import { jsonResponse } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";
import { listCmsUsers } from "#/lib/cms-users";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const admin = await getAdminUserFromRequest(request).catch(() => null);

        if (!admin) {
          return jsonResponse({ error: "Admin authentication required" }, { status: 401 });
        }

        return jsonResponse({ data: await listCmsUsers() });
      },
      POST: async ({ request }: { request: Request }) => {
        const formPost = isFormPost(request);
        const existingAdmins = await countAdminUsers();

        if (existingAdmins > 0) {
          const accessError = await requireAdminSession(request);

          if (accessError) {
            if (formPost) {
              return formRedirect("/signup?error=1");
            }

            return accessError;
          }
        }

        const body = await readJsonOrFormBody<{ name: string; email: string; password: string }>(
          request,
        );
        const created = await createAdminUser(body).catch((error: unknown) => ({
          error: error instanceof Error ? error.message : "Admin user could not be created",
        }));

        if ("error" in created) {
          if (formPost) {
            return formRedirect("/signup?error=1");
          }

          return jsonResponse({ error: created.error }, { status: 400 });
        }

        const session = await loginAdmin({ email: body.email, password: body.password }, request);

        if ("error" in session) {
          return jsonResponse(
            { error: "Admin account was created, but the session could not be started." },
            { status: 500 },
          );
        }

        if (formPost) {
          return formRedirect("/admin", { headers: session.headers });
        }

        return jsonResponse(
          { data: publicAdminUser(session.data) },
          { status: 201, headers: session.headers },
        );
      },
    },
  },
});
