import { createFileRoute } from "@tanstack/react-router";

import { AccountEmailPreferencesPatchSchema, validateBody } from "#/lib/api-validation";
import { auth } from "#/lib/auth";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { getCmsUserById, updateCmsUser } from "#/lib/cms-users";

type EmailPreferenceUpdate = {
  commentReplyNotificationsEnabled?: boolean;
  emailPreference?: Parameters<typeof updateCmsUser>[1]["emailPreference"];
  marketingOptOut?: boolean;
};

export const Route = createFileRoute("/api/account/email-preferences")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const user = await getCurrentUser(request);

        if (!user) {
          return jsonResponse({ error: "Authentication required" }, { status: 401 });
        }

        return jsonResponse({
          data: {
            commentReplyNotificationsEnabled: user.commentReplyNotificationsEnabled,
            emailPreference: user.emailPreference,
            marketingOptOut: user.marketingOptOut,
          },
        });
      },
      PATCH: async ({ request }: { request: Request }) => {
        const user = await getCurrentUser(request);

        if (!user) {
          return jsonResponse({ error: "Authentication required" }, { status: 401 });
        }

        const rawBody = await readJsonBody(request);
        const [body, validationError] = validateBody(
          AccountEmailPreferencesPatchSchema,
          rawBody && typeof rawBody === "object" ? rawBody : {},
        );

        if (validationError) {
          return validationError;
        }

        const updates: EmailPreferenceUpdate = body;
        const updated = await updateCmsUser(user.id, updates);

        return jsonResponse({
          data: {
            commentReplyNotificationsEnabled:
              updated?.commentReplyNotificationsEnabled ?? user.commentReplyNotificationsEnabled,
            emailPreference: updated?.emailPreference ?? user.emailPreference,
            marketingOptOut: updated?.marketingOptOut ?? user.marketingOptOut,
          },
        });
      },
    },
  },
});

async function getCurrentUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    return null;
  }

  return getCmsUserById(session.user.id);
}
