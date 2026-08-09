import { createFileRoute } from "@tanstack/react-router";

import { getAdminUserFromRequest } from "#/lib/admin-auth";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireAdminSession } from "#/lib/cms-authz";
import { getEmailDeliveryStatus } from "#/lib/cms-email";
import {
  getBroadcastAudienceCount,
  sendBroadcastPreview,
  sendManualBroadcast,
} from "#/lib/email-notifications";

export const Route = createFileRoute("/api/admin/email-broadcasts")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        return jsonResponse({
          data: {
            audienceCount: await getBroadcastAudienceCount(),
            delivery: getEmailDeliveryStatus(),
          },
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const accessError = await requireAdminSession(request);

        if (accessError) {
          return accessError;
        }

        const admin = await getAdminUserFromRequest(request);

        if (!admin) {
          return jsonResponse({ error: "Admin authentication required" }, { status: 401 });
        }

        const body = await readJsonBody<{
          action?: "preview" | "send";
          message?: string;
          subject?: string;
          testEmail?: string;
        }>(request);
        const subject = body.subject?.trim() ?? "";
        const message = body.message?.trim() ?? "";

        if (!subject || !message) {
          return jsonResponse({ error: "Subject and message are required" }, { status: 400 });
        }

        if (body.action === "preview") {
          const testEmail = body.testEmail?.trim() || admin?.email || "";

          if (!testEmail) {
            return jsonResponse({ error: "A preview recipient is required" }, { status: 400 });
          }

          const preview = await sendBroadcastPreview({ email: testEmail, message, subject });

          if (!("messageId" in preview)) {
            return jsonResponse({ error: preview.reason }, { status: 400 });
          }

          return jsonResponse({ data: { messageId: preview.messageId } });
        }

        const result = await sendManualBroadcast({
          createdByUserId: admin?.id,
          message,
          subject,
        });

        if ("error" in result) {
          return jsonResponse({ error: result.error }, { status: 400 });
        }

        return jsonResponse({ data: result });
      },
    },
  },
});
