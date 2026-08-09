import { createFileRoute } from "@tanstack/react-router";

import { ApiTokenCreateSchema, validateBody } from "#/lib/api-validation";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";
import { createD1ApiToken, listD1ApiTokens } from "#/lib/cms-d1";

export const Route = createFileRoute("/api/tokens")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const tokens = await listD1ApiTokens();

        return jsonResponse({
          data: tokens,
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const rawBody = await readJsonBody(request);
        const [body, validationError] = validateBody(ApiTokenCreateSchema, rawBody);

        if (validationError) {
          return validationError;
        }

        const created = await createD1ApiToken({
          name: body.name,
          scopes: body.scopes,
          expiresAt: body.expiresAt,
        });

        return jsonResponse(
          {
            data: created.token,
            secret: created.secret,
            requiredScope: "site:write",
          },
          { status: 201 },
        );
      },
    },
  },
});
