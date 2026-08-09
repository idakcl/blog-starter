import "@tanstack/react-start/server-only";
import {
  toIsoString,
  type CmsUser,
  type CommentUserStatus,
  type EmailPreference,
  type UserRole,
} from "@repo/core";
import { createAuthDb } from "@repo/db";
import { account as authAccountTable, user as authUserTable } from "@repo/db/schema";
import * as cmsSchema from "@repo/db/schema/cms";
import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";

import { getCmsDb } from "./cms-db";
import { isEmailPreference as isSupportedEmailPreference } from "./email-preferences";

type AuthUserRow = typeof authUserTable.$inferSelect;

const authDb = createAuthDb(env.CMS_DB as Parameters<typeof createAuthDb>[0]);

export function isCommentUserStatus(value: unknown): value is CommentUserStatus {
  return value === "active" || value === "muted";
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "reader";
}

export function isEmailPreference(value: unknown): value is EmailPreference {
  return isSupportedEmailPreference(value);
}

export async function listCmsUsers(): Promise<CmsUser[]> {
  const [users, accounts, comments] = await Promise.all([
    authDb.select().from(authUserTable).orderBy(desc(authUserTable.createdAt)),
    authDb
      .select({
        providerId: authAccountTable.providerId,
        userId: authAccountTable.userId,
      })
      .from(authAccountTable),
    getCmsDb()
      .select({
        authorUserId: cmsSchema.comments.authorUserId,
        createdAt: cmsSchema.comments.createdAt,
      })
      .from(cmsSchema.comments),
  ]);

  const providersByUserId = new Map<string, CmsUser["providers"]>();

  for (const account of accounts) {
    const providers = providersByUserId.get(account.userId) ?? [];
    const provider = providerIdToUserProvider(account.providerId);

    if (!providers.includes(provider)) {
      providers.push(provider);
    }

    providersByUserId.set(account.userId, providers);
  }

  const commentsByUserId = new Map<string, { count: number; lastCommentAt: string | null }>();

  for (const comment of comments) {
    if (!comment.authorUserId) {
      continue;
    }

    const current = commentsByUserId.get(comment.authorUserId) ?? {
      count: 0,
      lastCommentAt: null,
    };

    commentsByUserId.set(comment.authorUserId, {
      count: current.count + 1,
      lastCommentAt:
        !current.lastCommentAt || comment.createdAt > current.lastCommentAt
          ? comment.createdAt
          : current.lastCommentAt,
    });
  }

  return users.map((user) =>
    toCmsUser(user, {
      commentStats: commentsByUserId.get(user.id),
      providers: providersByUserId.get(user.id),
    }),
  );
}

export async function getCmsUserById(id: string): Promise<CmsUser | null> {
  const user = await getAuthUserById(id);

  if (!user) {
    return null;
  }

  const [accounts, comments] = await Promise.all([
    authDb
      .select({
        providerId: authAccountTable.providerId,
      })
      .from(authAccountTable)
      .where(eq(authAccountTable.userId, id)),
    getCmsDb()
      .select({
        createdAt: cmsSchema.comments.createdAt,
      })
      .from(cmsSchema.comments)
      .where(eq(cmsSchema.comments.authorUserId, id)),
  ]);

  return toCmsUser(user, {
    commentStats: comments.reduce(
      (stats, comment) => ({
        count: stats.count + 1,
        lastCommentAt:
          !stats.lastCommentAt || comment.createdAt > stats.lastCommentAt
            ? comment.createdAt
            : stats.lastCommentAt,
      }),
      { count: 0, lastCommentAt: null } as { count: number; lastCommentAt: string | null },
    ),
    providers: accounts.map((account) => providerIdToUserProvider(account.providerId)),
  });
}

export async function updateCmsUser(
  id: string,
  input: {
    readonly commentStatus?: CommentUserStatus;
    readonly commentReplyNotificationsEnabled?: boolean;
    readonly emailPreference?: EmailPreference;
    readonly marketingOptOut?: boolean;
    readonly name?: string;
    readonly role?: UserRole;
  },
): Promise<CmsUser | null> {
  const existing = await getAuthUserById(id);

  if (!existing) {
    return null;
  }

  const nextValues: Partial<typeof authUserTable.$inferInsert> = {};

  if (input.commentStatus && input.commentStatus !== existing.commentStatus) {
    nextValues.commentStatus = input.commentStatus;
    nextValues.commentStatusUpdatedAt = new Date().toISOString();
  }

  if (input.role && input.role !== existing.role) {
    nextValues.role = input.role;
  }

  if (
    input.commentReplyNotificationsEnabled !== undefined &&
    input.commentReplyNotificationsEnabled !== existing.commentReplyNotificationsEnabled
  ) {
    nextValues.commentReplyNotificationsEnabled = input.commentReplyNotificationsEnabled;
  }

  if (input.emailPreference && input.emailPreference !== existing.emailPreference) {
    nextValues.emailPreference = input.emailPreference;
    nextValues.emailPreferenceUpdatedAt = new Date().toISOString();

    if (input.emailPreference !== "none") {
      nextValues.marketingOptOut = false;
    }
  }

  if (input.marketingOptOut !== undefined && input.marketingOptOut !== existing.marketingOptOut) {
    nextValues.marketingOptOut = input.marketingOptOut;
    nextValues.emailPreferenceUpdatedAt = new Date().toISOString();

    if (input.marketingOptOut) {
      nextValues.emailPreference = "none";
    }
  }

  if (input.name !== undefined) {
    const name = input.name.replace(/\s+/g, " ").trim();

    if (name && name !== existing.name) {
      nextValues.name = name;
    }
  }

  if (!Object.keys(nextValues).length) {
    return getCmsUserById(id);
  }

  await authDb.update(authUserTable).set(nextValues).where(eq(authUserTable.id, id));

  return getCmsUserById(id);
}

async function getAuthUserById(id: string) {
  return (await authDb.select().from(authUserTable).where(eq(authUserTable.id, id)).limit(1))[0];
}

function toCmsUser(
  user: AuthUserRow,
  options: {
    readonly commentStats?: { count: number; lastCommentAt: string | null };
    readonly providers?: CmsUser["providers"];
  } = {},
): CmsUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    image: user.image,
    commentStatus: user.commentStatus,
    commentStatusUpdatedAt: user.commentStatusUpdatedAt,
    emailPreference: user.emailPreference,
    emailPreferenceUpdatedAt: user.emailPreferenceUpdatedAt,
    marketingOptOut: user.marketingOptOut,
    commentReplyNotificationsEnabled: user.commentReplyNotificationsEnabled,
    providers: options.providers?.length ? options.providers : ["unknown"],
    commentCount: options.commentStats?.count ?? 0,
    lastCommentAt: options.commentStats?.lastCommentAt ?? null,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}

function providerIdToUserProvider(providerId: string): CmsUser["providers"][number] {
  if (providerId === "credential") {
    return "email";
  }

  if (providerId === "github") {
    return "github";
  }

  if (providerId === "google") {
    return "google";
  }

  return "unknown";
}
