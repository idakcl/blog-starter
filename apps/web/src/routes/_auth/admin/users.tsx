import { useAuthSuspense } from "@repo/auth/tanstack/hooks";
import {
  type CmsUser,
  type Comment,
  type CommentUserStatus,
  type EmailPreference,
  type Post,
  type UserRole,
} from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  EyeIcon,
  KeyRoundIcon,
  LogOutIcon,
  MailIcon,
  type LucideIcon,
  MessageSquareTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserCogIcon,
  UserRoundIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  adminSelectClassName,
} from "#/components/admin/admin-ui";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/users")({
  component: AdminUsersPage,
});

type RoleFilter = UserRole | "all";
type CommentStatusFilter = CommentUserStatus | "all";

function AdminUsersPage() {
  const locale = getCurrentLocale();
  const copy = getUsersActionCopy(locale);
  const { user: currentUser } = useAuthSuspense();
  const [rows, setRows] = useState<CmsUser[]>([]);
  const [commentRows, setCommentRows] = useState<Comment[]>([]);
  const [postRows, setPostRows] = useState<Post[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<CommentStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    let ignore = false;

    void Promise.all([
      fetch("/api/admin/users").then((response) => (response.ok ? response.json() : undefined)),
      fetch(`/api/comments?lang=${locale}`).then((response) =>
        response.ok ? response.json() : undefined,
      ),
      fetch(`/api/posts?status=all&lang=${locale}`).then((response) =>
        response.ok ? response.json() : undefined,
      ),
    ]).then(([userPayload, commentPayload, postPayload]) => {
      const users = (userPayload as { data?: CmsUser[] } | undefined)?.data;
      const comments = (commentPayload as { data?: Comment[] } | undefined)?.data;
      const posts = (postPayload as { data?: Post[] } | undefined)?.data;

      if (!ignore && users) {
        setRows(users);
      }

      if (!ignore && comments) {
        setCommentRows(comments);
      }

      if (!ignore && posts) {
        setPostRows(posts);
      }
    });

    return () => {
      ignore = true;
    };
  }, [locale]);

  const stats = useMemo(
    () => ({
      active: rows.filter((user) => user.commentStatus === "active").length,
      admin: rows.filter((user) => user.role === "admin").length,
      muted: rows.filter((user) => user.commentStatus === "muted").length,
      reader: rows.filter((user) => user.role === "reader").length,
      subscribed: rows.filter((user) => user.emailPreference !== "none").length,
      total: rows.length,
    }),
    [rows],
  );
  const postById = useMemo(
    () => new Map(postRows.map((post) => [post.id, post] as const)),
    [postRows],
  );
  const commentsByUserId = useMemo(() => {
    const nextCommentsByUserId = new Map<string, Comment[]>();

    for (const comment of commentRows) {
      if (!comment.authorUserId) {
        continue;
      }

      const userComments = nextCommentsByUserId.get(comment.authorUserId) ?? [];
      userComments.push(comment);
      nextCommentsByUserId.set(comment.authorUserId, userComments);
    }

    return nextCommentsByUserId;
  }, [commentRows]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((user) => {
    const roleMatches = roleFilter === "all" || user.role === roleFilter;
    const statusMatches = statusFilter === "all" || user.commentStatus === statusFilter;
    const queryMatches =
      !normalizedQuery ||
      [user.name, user.email, user.providers.join(" ")].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );

    return roleMatches && statusMatches && queryMatches;
  });

  const updateUser = async (
    user: CmsUser,
    input: {
      readonly commentStatus?: CommentUserStatus;
      readonly emailPreference?: EmailPreference;
      readonly marketingOptOut?: boolean;
      readonly role?: UserRole;
    },
    successMessage: (updatedUser: CmsUser) => string,
  ) => {
    setPendingUserId(user.id);
    setActionStatus("idle");

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);

    setPendingUserId(null);

    if (!response?.ok) {
      setActionStatus("error");
      toast.error(copy.updateError, {
        description: response
          ? await getResponseErrorMessage(response, copy.updateError)
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: CmsUser };
    setRows((current) =>
      current.map((currentUser) => (currentUser.id === user.id ? payload.data : currentUser)),
    );
    setActionStatus("saved");
    toast.success(successMessage(payload.data));
  };

  const updateCommentStatus = async (user: CmsUser, commentStatus: CommentUserStatus) => {
    await updateUser(user, { commentStatus }, (updatedUser) =>
      copy.commentUpdateSuccess(updatedUser.name, updatedUser.commentStatus),
    );
  };

  const updateUserRole = async (user: CmsUser, role: UserRole) => {
    await updateUser(user, { role }, (updatedUser) =>
      copy.roleUpdateSuccess(updatedUser.name, updatedUser.role),
    );
  };

  const updateEmailPreference = async (user: CmsUser, emailPreference: EmailPreference) => {
    await updateUser(user, { emailPreference }, (updatedUser) =>
      copy.emailUpdateSuccess(updatedUser.name, updatedUser.emailPreference),
    );
  };

  const sendPasswordReset = async (user: CmsUser) => {
    setPendingUserId(user.id);
    setActionStatus("idle");

    const response = await fetch(`/api/admin/users/${user.id}/password-reset`, {
      method: "POST",
    }).catch(() => null);

    setPendingUserId(null);

    if (!response?.ok) {
      setActionStatus("error");
      toast.error(copy.passwordResetError, {
        description: response
          ? await getResponseErrorMessage(response, copy.passwordResetError)
          : copy.networkError,
      });
      return;
    }

    setActionStatus("saved");
    toast.success(copy.passwordResetSuccess(user.name));
  };

  const revokeSessions = async (user: CmsUser) => {
    setPendingUserId(user.id);
    setActionStatus("idle");

    const response = await fetch(`/api/admin/users/${user.id}/sessions`, {
      method: "POST",
    }).catch(() => null);

    setPendingUserId(null);

    if (!response?.ok) {
      setActionStatus("error");
      toast.error(copy.sessionRevokeError, {
        description: response
          ? await getResponseErrorMessage(response, copy.sessionRevokeError)
          : copy.networkError,
      });
      return;
    }

    setActionStatus("saved");
    toast.success(copy.sessionRevokeSuccess(user.name));
  };

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={m.admin_users_title()}
        description={m.admin_users_description()}
        actions={
          actionStatus !== "idle" ? (
            <p
              className={`self-center text-sm ${
                actionStatus === "saved" ? "text-success" : "text-destructive"
              }`}
            >
              {actionStatus === "saved" ? m.admin_users_saved() : m.admin_users_error()}
            </p>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UserMetric label={m.admin_users_total()} value={stats.total} icon={UserRoundIcon} />
        <UserMetric label={m.admin_users_role_reader()} value={stats.reader} icon={UserRoundIcon} />
        <UserMetric label={m.admin_users_role_admin()} value={stats.admin} icon={ShieldIcon} />
        <UserMetric label={copy.emailSubscribers} value={stats.subscribed} icon={MailIcon} />
      </div>

      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.35fr]">
          <div className="grid gap-2">
            <Label htmlFor="user-role-filter">{m.admin_users_filter_role()}</Label>
            <select
              id="user-role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.currentTarget.value as RoleFilter)}
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_users_role_all()}</option>
              <option value="reader">{m.admin_users_role_reader()}</option>
              <option value="admin">{m.admin_users_role_admin()}</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-status-filter">{m.admin_users_filter_status()}</Label>
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as CommentStatusFilter)
              }
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_users_status_all()}</option>
              <option value="active">{m.admin_users_status_active()}</option>
              <option value="muted">{m.admin_users_status_muted()}</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-search">{m.admin_users_search()}</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="user-search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                className={`${adminInputClassName} pl-9`}
                placeholder={m.admin_users_search_placeholder()}
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredRows.length ? null : (
            <p className="rounded-md border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
              {m.admin_users_empty()}
            </p>
          )}
          {filteredRows.map((user) => {
            const muted = user.commentStatus === "muted";
            const isCurrentAdmin = currentUser?.id === user.id;
            const userComments = commentsByUserId.get(user.id) ?? [];
            const commentsExpanded = expandedUserId === user.id;
            const nextRole = user.role === "admin" ? "reader" : "admin";
            const roleChangeDisabled =
              pendingUserId === user.id ||
              isCurrentAdmin ||
              (user.role === "admin" && stats.admin <= 1);

            return (
              <article key={user.id} className="rounded-md border border-border bg-muted/45 p-3">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-medium">{user.name}</h2>
                      <StatusBadge tone={muted ? "muted" : "active"}>
                        {commentAccessLabel(user.commentStatus)}
                      </StatusBadge>
                      <StatusBadge tone="neutral">{roleLabel(user.role)}</StatusBadge>
                      <StatusBadge tone={user.emailPreference === "none" ? "neutral" : "active"}>
                        {emailPreferenceLabel(user.emailPreference, copy)}
                      </StatusBadge>
                      {user.marketingOptOut ? (
                        <StatusBadge tone="muted">{copy.optionalEmailOptOut}</StatusBadge>
                      ) : null}
                      {isCurrentAdmin ? (
                        <StatusBadge tone="neutral">{copy.currentAccount}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span>{providerLabel(user.providers)}</span>
                      <span>
                        {user.emailVerified
                          ? m.admin_users_email_verified()
                          : m.admin_users_email_unverified()}
                      </span>
                      <span>
                        {m.admin_users_joined({ date: formatDate(user.createdAt, locale) })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={nextRole === "admin" ? "default" : "outline"}
                      disabled={roleChangeDisabled}
                      onClick={() => void updateUserRole(user, nextRole)}
                      title={
                        isCurrentAdmin
                          ? copy.currentAdminRoleLocked
                          : user.role === "admin" && stats.admin <= 1
                            ? copy.lastAdminRoleLocked
                            : undefined
                      }
                    >
                      {nextRole === "admin" ? (
                        <ShieldCheckIcon className="size-4" />
                      ) : (
                        <UserCogIcon className="size-4" />
                      )}
                      {nextRole === "admin" ? copy.makeAdmin : copy.makeReader}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={muted ? "outline" : "destructive"}
                      disabled={pendingUserId === user.id}
                      onClick={() => void updateCommentStatus(user, muted ? "active" : "muted")}
                    >
                      {muted ? (
                        <Volume2Icon className="size-4" />
                      ) : (
                        <VolumeXIcon className="size-4" />
                      )}
                      {muted ? m.admin_users_unmute() : m.admin_users_mute()}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={commentsExpanded ? "default" : "outline"}
                      disabled={!user.commentCount}
                      aria-expanded={commentsExpanded}
                      onClick={() => setExpandedUserId(commentsExpanded ? null : user.id)}
                    >
                      {commentsExpanded ? (
                        <EyeIcon className="size-4" />
                      ) : (
                        <MessageSquareTextIcon className="size-4" />
                      )}
                      {commentsExpanded ? copy.hideComments : copy.viewComments}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingUserId === user.id}
                      onClick={() => void sendPasswordReset(user)}
                    >
                      <KeyRoundIcon className="size-4" />
                      {copy.sendPasswordReset}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingUserId === user.id || isCurrentAdmin}
                      title={isCurrentAdmin ? copy.currentAdminSessionsLocked : undefined}
                      onClick={() => void revokeSessions(user)}
                    >
                      <LogOutIcon className="size-4" />
                      {copy.revokeSessions}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-border/80 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <UserFact
                    label={m.admin_users_comments()}
                    value={m.admin_users_comments_count({ count: user.commentCount })}
                  />
                  <UserFact
                    label={m.admin_users_last_comment()}
                    value={
                      user.lastCommentAt
                        ? formatDate(user.lastCommentAt, locale)
                        : m.admin_users_no_comments()
                    }
                  />
                  <UserFact
                    label={m.admin_users_status_updated()}
                    value={
                      user.commentStatusUpdatedAt
                        ? formatDate(user.commentStatusUpdatedAt, locale)
                        : m.admin_users_status_not_changed()
                    }
                  />
                  <div className="grid gap-1">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {copy.emailUpdates}
                    </p>
                    <select
                      value={user.emailPreference}
                      disabled={pendingUserId === user.id}
                      onChange={(event) =>
                        void updateEmailPreference(
                          user,
                          event.currentTarget.value as EmailPreference,
                        )
                      }
                      className={adminSelectClassName}
                    >
                      <option value="none">{copy.emailNone}</option>
                      <option value="weekly_blog_updates">{copy.emailWeeklyUpdates}</option>
                    </select>
                  </div>
                </div>

                {commentsExpanded ? (
                  <UserCommentsPanel
                    comments={userComments}
                    locale={locale}
                    postById={postById}
                    copy={copy}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </AdminPanel>
    </section>
  );
}

function UserMetric({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <AdminPanel className="min-h-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <Icon className="size-5 text-link" />
      </div>
    </AdminPanel>
  );
}

function UserFact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-foreground">{value}</p>
    </div>
  );
}

type UsersActionCopy = ReturnType<typeof getUsersActionCopy>;

function UserCommentsPanel({
  comments,
  copy,
  locale,
  postById,
}: {
  readonly comments: Comment[];
  readonly copy: UsersActionCopy;
  readonly locale: ReturnType<typeof getCurrentLocale>;
  readonly postById: Map<string, Post>;
}) {
  return (
    <div className="mt-4 border-t border-border/80 pt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{copy.userComments(comments.length)}</p>
        <p className="text-xs text-muted-foreground">{copy.commentHistory}</p>
      </div>

      {comments.length ? (
        <div className="grid gap-3">
          {comments.map((comment) => {
            const localizedPost = postById.get(comment.postId);

            return (
              <article
                key={comment.id}
                className="rounded-md border border-border bg-card/80 p-3 text-sm"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {localizedPost?.title ?? copy.unknownPost}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(comment.createdAt, locale)}
                    </p>
                  </div>
                  <StatusBadge tone={moderationStatusTone(comment.status)}>
                    {moderationStatusLabel(comment.status)}
                  </StatusBadge>
                </div>
                <p className="mt-3 leading-6 break-words text-muted-foreground">{comment.body}</p>
                {localizedPost ? (
                  <div className="mt-3">
                    <Button
                      render={
                        <Link
                          to="/blog/$slug"
                          params={{ slug: localizedPost.slug }}
                          target="_blank"
                        />
                      }
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                    >
                      <EyeIcon className="size-4" />
                      {m.admin_comments_view_post()}
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
          {copy.noUserComments}
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  readonly children: string;
  readonly tone: "active" | "muted" | "neutral";
}) {
  const className =
    tone === "muted"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "active"
        ? "border-success/30 bg-success/10 text-success"
        : "border-border bg-card text-muted-foreground";

  return (
    <span className={`rounded-sm border px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function roleLabel(role: UserRole) {
  return role === "admin" ? m.admin_users_role_admin() : m.admin_users_role_reader();
}

function commentAccessLabel(status: CommentUserStatus) {
  return status === "muted" ? m.admin_users_status_muted() : m.admin_users_status_active();
}

function emailPreferenceLabel(emailPreference: EmailPreference, copy: UsersActionCopy) {
  if (emailPreference === "weekly_blog_updates") {
    return copy.emailWeeklyUpdates;
  }

  return copy.emailNone;
}

function moderationStatusLabel(status: Comment["status"]) {
  switch (status) {
    case "approved":
      return m.admin_comments_status_approved();
    case "deleted":
      return m.admin_comments_status_deleted();
    case "pending":
      return m.admin_comments_status_pending();
    case "spam":
      return m.admin_comments_status_spam();
  }
}

function moderationStatusTone(status: Comment["status"]): "active" | "muted" | "neutral" {
  if (status === "approved") {
    return "active";
  }

  if (status === "deleted" || status === "spam") {
    return "muted";
  }

  return "neutral";
}

function providerLabel(providers: CmsUser["providers"]) {
  const labels = providers.map((provider) => {
    if (provider === "github") {
      return "GitHub";
    }

    if (provider === "google") {
      return "Google";
    }

    if (provider === "email") {
      return m.admin_users_provider_email();
    }

    return m.admin_users_provider_unknown();
  });

  return labels.join(" · ");
}

function getUsersActionCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      commentHistory: "按发布时间倒序显示",
      currentAccount: "当前账号",
      currentAdminRoleLocked: "不能在这里修改当前登录管理员的角色。",
      currentAdminSessionsLocked: "不能在这里撤销当前登录管理员的会话。",
      emailNone: "不接收博客邮件",
      emailSubscribers: "邮件订阅",
      emailUpdates: "博客更新邮件",
      emailWeeklyUpdates: "每周更新",
      emailUpdateSuccess: (name: string, emailPreference: EmailPreference) => {
        const label = emailPreference === "weekly_blog_updates" ? "每周更新" : "不接收博客邮件";

        return `“${name}”已更新为${label}`;
      },
      hideComments: "收起评论",
      lastAdminRoleLocked: "至少需要保留一个管理员。",
      makeAdmin: "设为管理员",
      makeReader: "设为读者",
      networkError: "网络异常，请稍后再试。",
      noUserComments: "这个用户还没有发表过评论。",
      optionalEmailOptOut: "已退订可选邮件",
      passwordResetError: "重置邮件发送失败",
      passwordResetSuccess: (name: string) => `已向“${name}”发送密码重置邮件`,
      revokeSessions: "撤销会话",
      roleUpdateSuccess: (name: string, role: UserRole) =>
        role === "admin" ? `“${name}”已设为管理员` : `“${name}”已设为读者`,
      sendPasswordReset: "发送重置邮件",
      sessionRevokeError: "会话撤销失败",
      sessionRevokeSuccess: (name: string) => `“${name}”的会话已撤销`,
      updateError: "用户状态更新失败",
      userComments: (count: number) => `用户评论 · ${count} 条`,
      unknownPost: "未知文章",
      viewComments: "查看评论",
      commentUpdateSuccess: (name: string, status: CommentUserStatus) =>
        status === "muted" ? `“${name}”已禁言` : `“${name}”已恢复评论`,
    };
  }

  return {
    commentHistory: "Newest first",
    currentAccount: "You",
    currentAdminRoleLocked: "The signed-in admin role cannot be changed here.",
    currentAdminSessionsLocked: "The signed-in admin sessions cannot be revoked here.",
    emailNone: "No blog emails",
    emailSubscribers: "Email subscribers",
    emailUpdates: "Blog update emails",
    emailWeeklyUpdates: "Weekly updates",
    emailUpdateSuccess: (name: string, emailPreference: EmailPreference) => {
      const label = emailPreference === "weekly_blog_updates" ? "weekly updates" : "no blog emails";

      return `"${name}" email updates set to ${label}`;
    },
    hideComments: "Hide comments",
    lastAdminRoleLocked: "At least one admin is required.",
    makeAdmin: "Make admin",
    makeReader: "Make reader",
    networkError: "Network error. Try again in a moment.",
    noUserComments: "This user has not posted comments yet.",
    optionalEmailOptOut: "Optional emails off",
    passwordResetError: "Password reset email could not be sent",
    passwordResetSuccess: (name: string) => `Password reset email sent to "${name}"`,
    revokeSessions: "Revoke sessions",
    roleUpdateSuccess: (name: string, role: UserRole) =>
      role === "admin" ? `"${name}" is now an admin` : `"${name}" is now a reader`,
    sendPasswordReset: "Send reset email",
    sessionRevokeError: "Sessions could not be revoked",
    sessionRevokeSuccess: (name: string) => `"${name}" sessions revoked`,
    updateError: "User status could not be updated",
    userComments: (count: number) => `User comments · ${count}`,
    unknownPost: "Unknown post",
    viewComments: "View comments",
    commentUpdateSuccess: (name: string, status: CommentUserStatus) =>
      status === "muted" ? `"${name}" muted` : `"${name}" can comment again`,
  };
}

function formatDate(value: string, locale: ReturnType<typeof getCurrentLocale>) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
