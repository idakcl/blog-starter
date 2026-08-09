import { type CommentUserStatus, type EmailPreference, type UserRole } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";

import { revokeAccountSessions } from "#/lib/account-security";
import { countAdminUsers, getAdminUserFromRequest } from "#/lib/admin-auth";
import { jsonResponse, readJsonBody } from "#/lib/cms-api";
import {
  getCmsUserById,
  isCommentUserStatus,
  isEmailPreference,
  isUserRole,
  updateCmsUser,
} from "#/lib/cms-users";

export const Route = createFileRoute("/api/admin/users/$id")({
  server: {
    handlers: {
      PATCH: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const admin = await getAdminUserFromRequest(request).catch(() => null);

        if (!admin) {
          return jsonResponse({ error: "Admin authentication required" }, { status: 401 });
        }

        const rawBody = await readJsonBody<{
          commentStatus?: unknown;
          emailPreference?: unknown;
          marketingOptOut?: unknown;
          role?: unknown;
        }>(request);
        const body = rawBody && typeof rawBody === "object" ? rawBody : {};
        const updates: {
          commentStatus?: CommentUserStatus;
          emailPreference?: EmailPreference;
          marketingOptOut?: boolean;
          role?: UserRole;
        } = {};

        if ("commentStatus" in body) {
          if (!isCommentUserStatus(body.commentStatus)) {
            return jsonResponse({ error: "Invalid comment status" }, { status: 400 });
          }

          updates.commentStatus = body.commentStatus;
        }

        if ("role" in body) {
          if (!isUserRole(body.role)) {
            return jsonResponse({ error: "Invalid role" }, { status: 400 });
          }

          updates.role = body.role;
        }

        if ("emailPreference" in body) {
          if (!isEmailPreference(body.emailPreference)) {
            return jsonResponse({ error: "Invalid email preference" }, { status: 400 });
          }

          updates.emailPreference = body.emailPreference;
        }

        if ("marketingOptOut" in body) {
          if (typeof body.marketingOptOut !== "boolean") {
            return jsonResponse({ error: "Invalid marketing preference" }, { status: 400 });
          }

          updates.marketingOptOut = body.marketingOptOut;
        }

        if (
          !updates.commentStatus &&
          !updates.role &&
          !updates.emailPreference &&
          updates.marketingOptOut === undefined
        ) {
          return jsonResponse({ error: "No user update provided" }, { status: 400 });
        }

        const existingUser = updates.role ? await getCmsUserById(params.id) : null;

        if (updates.role && !existingUser) {
          return jsonResponse({ error: "User not found" }, { status: 404 });
        }

        if (updates.role && existingUser?.id === admin.id && updates.role !== existingUser.role) {
          return jsonResponse({ error: "Current admin role cannot be changed" }, { status: 400 });
        }

        if (
          updates.role === "reader" &&
          existingUser?.role === "admin" &&
          (await countAdminUsers()) <= 1
        ) {
          return jsonResponse({ error: "At least one admin is required" }, { status: 400 });
        }

        const user = await updateCmsUser(params.id, updates);

        if (!user) {
          return jsonResponse({ error: "User not found" }, { status: 404 });
        }

        if (updates.role && existingUser && updates.role !== existingUser.role) {
          await revokeAccountSessions(params.id);
        }

        return jsonResponse({ data: user });
      },
    },
  },
});
