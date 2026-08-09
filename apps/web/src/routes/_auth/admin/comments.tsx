import {
  defaultAiCommentModerationRules,
  type Comment,
  type Post,
  type SiteSettings,
} from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BotIcon,
  CheckIcon,
  SaveIcon,
  SearchIcon,
  Settings2Icon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  AdminPanel,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "#/components/admin/admin-ui";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/comments")({
  component: AdminCommentsPage,
});

type ModerationAction = "approve" | "delete" | "spam";
type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;
type CommentSettings = Pick<
  SiteSettings,
  | "commentsEnabled"
  | "commentsRequireApproval"
  | "commentAutoBlockEnabled"
  | "commentBlockedKeywords"
  | "aiCommentModerationEnabled"
  | "aiCommentModerationRules"
>;

const commentStatuses: Array<Comment["status"]> = ["pending", "approved", "spam", "deleted"];
const defaultCommentSettings: CommentSettings = {
  commentsEnabled: true,
  commentsRequireApproval: true,
  commentAutoBlockEnabled: false,
  commentBlockedKeywords: [],
  aiCommentModerationEnabled: false,
  aiCommentModerationRules: defaultAiCommentModerationRules,
};

function AdminCommentsPage() {
  const locale = getCurrentLocale();
  const copy = getCommentsActionCopy(locale);
  const [rows, setRows] = useState<Comment[]>([]);
  const [postRows, setPostRows] = useState<Post[]>([]);
  const [commentSettings, setCommentSettings] = useState<CommentSettings>(defaultCommentSettings);
  const [commentSettingsStatus, setCommentSettingsStatus] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [statusFilter, setStatusFilter] = useState<Comment["status"] | "all">("pending");
  const [postFilter, setPostFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    void Promise.all([
      fetch(`/api/comments?lang=${locale}`).then((response) =>
        response.ok ? response.json() : undefined,
      ),
      fetch(`/api/posts?status=all&lang=${locale}`).then((response) =>
        response.ok ? response.json() : undefined,
      ),
      fetch("/api/site").then((response) => (response.ok ? response.json() : undefined)),
    ]).then(([commentPayload, postPayload, sitePayload]) => {
      const nextComments = (commentPayload as { data?: Comment[] } | undefined)?.data;
      const nextPosts = (postPayload as { data?: Post[] } | undefined)?.data;
      const nextSettings = (sitePayload as { data?: SiteSettings } | undefined)?.data;

      if (!ignore && nextComments) {
        setRows(nextComments);
      }

      if (!ignore && nextPosts) {
        setPostRows(nextPosts);
      }

      if (!ignore && nextSettings) {
        setCommentSettings(pickCommentSettings(nextSettings));
      }
    });

    return () => {
      ignore = true;
    };
  }, [locale]);

  const postById = useMemo(
    () => new Map(postRows.map((post) => [post.id, post] as const)),
    [postRows],
  );
  const counts = useMemo(
    () =>
      commentStatuses.reduce(
        (nextCounts, status) => ({
          ...nextCounts,
          [status]: rows.filter((comment) => comment.status === status).length,
        }),
        {} as Record<Comment["status"], number>,
      ),
    [rows],
  );

  const moderate = async (
    id: string,
    action: ModerationAction,
    options: { silent?: boolean } = {},
  ) => {
    const response = await fetch(`/api/comments/${id}/${action}`, { method: "POST" }).catch(
      () => null,
    );

    if (!response?.ok) {
      if (!options.silent) {
        toast.error(copy.actionError(action), {
          description: response
            ? await getResponseErrorMessage(response, copy.actionError(action))
            : copy.networkError,
        });
      }
      return false;
    }

    const payload = (await response.json()) as {
      data: Comment;
    };

    setRows((current) => current.map((comment) => (comment.id === id ? payload.data : comment)));
    if (!options.silent) {
      toast.success(copy.actionSuccess(action));
    }
    return true;
  };

  const saveCommentSettings: FormSubmitHandler = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/site", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        commentsEnabled: formData.get("commentsEnabled") === "on",
        commentsRequireApproval: formData.get("commentsRequireApproval") === "on",
        commentAutoBlockEnabled: formData.get("commentAutoBlockEnabled") === "on",
        commentBlockedKeywords: parseCommentBlockedKeywords(formData.get("commentBlockedKeywords")),
        aiCommentModerationEnabled: formData.get("aiCommentModerationEnabled") === "on",
        aiCommentModerationRules:
          formValueString(formData.get("aiCommentModerationRules")).trim() ||
          defaultAiCommentModerationRules,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setCommentSettingsStatus("error");
      toast.error(m.admin_settings_error(), {
        description: response
          ? await getResponseErrorMessage(response, m.admin_settings_error())
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: SiteSettings };
    setCommentSettings(pickCommentSettings(payload.data));
    window.dispatchEvent(
      new CustomEvent("blogcms:site-settings-updated", { detail: payload.data }),
    );
    setCommentSettingsStatus("saved");
    toast.success(m.admin_settings_saved());
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((comment) => {
    const localizedPost = postById.get(comment.postId);
    const statusMatches = statusFilter === "all" || comment.status === statusFilter;
    const postMatches = postFilter === "all" || comment.postId === postFilter;
    const queryMatches =
      !normalizedQuery ||
      [comment.authorName, comment.body, localizedPost?.title ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );

    return statusMatches && postMatches && queryMatches;
  });
  const visibleCommentIds = filteredRows.map((comment) => comment.id);
  const visibleCommentIdSet = new Set(visibleCommentIds);
  const selectedVisibleCount = selectedCommentIds.filter((id) =>
    visibleCommentIdSet.has(id),
  ).length;
  const allVisibleSelected =
    filteredRows.length > 0 && selectedVisibleCount === filteredRows.length;
  const commentSettingsKey = [
    commentSettings.commentsEnabled,
    commentSettings.commentsRequireApproval,
    commentSettings.commentAutoBlockEnabled,
    commentSettings.commentBlockedKeywords.join("\n"),
    commentSettings.aiCommentModerationEnabled,
    commentSettings.aiCommentModerationRules,
  ].join("|");

  const toggleAllVisible = () => {
    setSelectedCommentIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleCommentIdSet.has(id));
      }

      return Array.from(new Set([...current, ...visibleCommentIds]));
    });
  };

  const toggleCommentSelection = (id: string) => {
    setSelectedCommentIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  };

  const applyBatchAction = async (action: ModerationAction) => {
    const targetIds = selectedCommentIds.filter((id) => visibleCommentIdSet.has(id));
    let successCount = 0;

    for (const id of targetIds) {
      if (await moderate(id, action, { silent: true })) {
        successCount += 1;
      }
    }

    setSelectedCommentIds((current) => current.filter((id) => !targetIds.includes(id)));
    if (successCount === targetIds.length) {
      toast.success(copy.batchSuccess(action, successCount));
      return;
    }

    toast.error(copy.batchPartial(action, successCount, targetIds.length));
  };

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={m.admin_comments_title()}
        description={m.admin_comments_description()}
        actions={
          <span className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium">
            {m.admin_comments_pending_count({ count: counts.pending })}
          </span>
        }
      />

      <AdminPanel>
        <form key={commentSettingsKey} onSubmit={saveCommentSettings} className="grid gap-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3">
              <Settings2Icon className="mt-1 size-5 text-link" />
              <div>
                <h2 className="text-xl font-semibold">{m.admin_comment_settings()}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {m.admin_comments_description()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {commentSettingsStatus !== "idle" ? (
                <p
                  className={`text-sm ${
                    commentSettingsStatus === "saved" ? "text-success" : "text-destructive"
                  }`}
                >
                  {commentSettingsStatus === "saved"
                    ? m.admin_settings_saved()
                    : m.admin_settings_error()}
                </p>
              ) : null}
              <Button type="submit" size="sm">
                <SaveIcon className="size-4" />
                {m.admin_save_settings()}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="commentsEnabled"
                  defaultChecked={commentSettings.commentsEnabled}
                  className="size-4 rounded border-input"
                />
                {m.comments()}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="commentsRequireApproval"
                  defaultChecked={commentSettings.commentsRequireApproval}
                  className="size-4 rounded border-input"
                />
                {m.admin_comments_require_approval()}
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="commentAutoBlockEnabled"
                  defaultChecked={commentSettings.commentAutoBlockEnabled}
                  className="size-4 rounded border-input"
                />
                {m.admin_comments_auto_block()}
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="aiCommentModerationEnabled"
                  defaultChecked={commentSettings.aiCommentModerationEnabled}
                  className="size-4 rounded border-input"
                />
                {locale === "zh" ? "使用 AI 辅助审核评论" : "Use AI to help review comments"}
              </label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comment-blocked-keywords">
                {m.admin_comments_blocked_keywords()}
              </Label>
              <textarea
                id="comment-blocked-keywords"
                name="commentBlockedKeywords"
                defaultValue={commentSettings.commentBlockedKeywords.join("\n")}
                rows={5}
                className={`${adminTextareaClassName} min-h-28`}
              />
              <p className="text-xs text-muted-foreground">
                {m.admin_comments_blocked_keywords_help()}
              </p>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="ai-comment-moderation-rules">
                {locale === "zh" ? "AI 审核规则" : "AI review rules"}
              </Label>
              <textarea
                id="ai-comment-moderation-rules"
                name="aiCommentModerationRules"
                defaultValue={commentSettings.aiCommentModerationRules}
                rows={4}
                className={`${adminTextareaClassName} min-h-28`}
              />
              <p className="text-xs text-muted-foreground">
                {locale === "zh"
                  ? "启用 AI 审核且已配置模型后，新评论会按这些规则辅助判断。模型异常时会回到原有审核逻辑。"
                  : "When AI review and a model are configured, new comments are checked against these rules. If the model fails, the existing moderation flow remains in place."}
              </p>
            </div>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            {m.admin_comments_status_all()} · {rows.length}
          </Button>
          {commentStatuses.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {commentStatusLabel(status)} · {counts[status]}
            </Button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1.25fr]">
          <div className="grid gap-2">
            <Label htmlFor="comment-status-filter">{m.admin_posts_filter_status()}</Label>
            <select
              id="comment-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as Comment["status"] | "all")
              }
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_comments_status_all()}</option>
              {commentStatuses.map((status) => (
                <option key={status} value={status}>
                  {commentStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comment-post-filter">{m.admin_comments_filter_post()}</Label>
            <select
              id="comment-post-filter"
              value={postFilter}
              onChange={(event) => setPostFilter(event.currentTarget.value)}
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_comments_all_posts()}</option>
              {postRows.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comment-search">{m.admin_comments_search()}</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="comment-search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                className={`${adminInputClassName} pl-9`}
                placeholder={m.admin_comments_search_placeholder()}
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>

        {filteredRows.length ? (
          <label className="mt-4 flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="size-4 rounded border-input"
            />
            {m.admin_comments_select_all()}
          </label>
        ) : null}

        {selectedVisibleCount ? (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-md border border-border bg-muted/35 p-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium">
              {m.admin_comments_selected({ count: selectedVisibleCount })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void applyBatchAction("approve")}>
                <CheckIcon />
                {m.admin_comments_batch_approve()}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void applyBatchAction("spam")}>
                <ShieldAlertIcon />
                {m.admin_comments_batch_spam()}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void applyBatchAction("delete")}
              >
                <Trash2Icon />
                {m.admin_comments_batch_delete()}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {filteredRows.length ? null : (
            <p className="rounded-md border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
              {m.admin_comments_empty()}
            </p>
          )}
          {filteredRows.map((comment) => {
            const localizedPost = postById.get(comment.postId);
            const selected = selectedCommentIds.includes(comment.id);

            return (
              <article key={comment.id} className="rounded-md border border-border bg-muted/45 p-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <label className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCommentSelection(comment.id)}
                      aria-label={m.admin_comments_select_one({
                        author: comment.authorName,
                      })}
                      className="mt-1 size-4 rounded border-input"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{comment.authorName}</span>
                      {localizedPost ? (
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {localizedPost.title}
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <span className="w-fit rounded-sm border border-border bg-card px-2 py-1 text-xs font-medium">
                    {commentStatusLabel(comment.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{comment.body}</p>
                <AiModerationSummary moderation={comment.aiModeration} locale={locale} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {localizedPost ? (
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
                      {m.admin_comments_view_post()}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => void moderate(comment.id, "approve")}
                    disabled={comment.status === "approved"}
                  >
                    <CheckIcon className="size-4" />
                    {m.admin_comments_approve()}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void moderate(comment.id, "spam")}
                    disabled={comment.status === "spam"}
                  >
                    <ShieldAlertIcon className="size-4" />
                    {m.admin_comments_mark_spam()}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void moderate(comment.id, "delete")}
                    disabled={comment.status === "deleted"}
                  >
                    <Trash2Icon className="size-4" />
                    {m.admin_comments_delete()}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </AdminPanel>
    </section>
  );
}

function AiModerationSummary({
  locale,
  moderation,
}: {
  readonly locale: "en" | "zh";
  readonly moderation: Comment["aiModeration"];
}) {
  if (!moderation || moderation.status === "not_requested") {
    return null;
  }

  const copy = getAiModerationSummaryCopy(moderation, locale);
  const reviewedAt = moderation.reviewedAt
    ? formatAiModerationDate(moderation.reviewedAt, locale)
    : null;

  return (
    <div className="mt-3 flex items-start gap-2 border-l-2 border-border bg-background/55 py-2 pr-3 pl-3">
      <BotIcon className="mt-0.5 size-4 shrink-0 text-link" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">{copy.heading}</span>
          <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
            {copy.label}
          </span>
          {reviewedAt ? <span className="text-xs text-muted-foreground">{reviewedAt}</span> : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.detail}</p>
      </div>
    </div>
  );
}

function pickCommentSettings(settings: SiteSettings): CommentSettings {
  return {
    commentsEnabled: settings.commentsEnabled,
    commentsRequireApproval: settings.commentsRequireApproval,
    commentAutoBlockEnabled: settings.commentAutoBlockEnabled,
    commentBlockedKeywords: settings.commentBlockedKeywords,
    aiCommentModerationEnabled: settings.aiCommentModerationEnabled,
    aiCommentModerationRules: settings.aiCommentModerationRules,
  };
}

function parseCommentBlockedKeywords(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function formValueString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function getAiModerationSummaryCopy(
  moderation: NonNullable<Comment["aiModeration"]>,
  locale: "en" | "zh",
) {
  if (moderation.status === "pending") {
    return locale === "zh"
      ? {
          heading: "AI 审核记录",
          label: "审核中",
          detail: "模型正在处理，结果写入后会更新评论状态。",
        }
      : {
          heading: "AI review record",
          label: "Reviewing",
          detail:
            "The model is reviewing this comment and will update the status when it finishes.",
        };
  }

  if (moderation.status === "failed") {
    const fallback =
      locale === "zh" ? "已按原有审核逻辑处理。" : "Handled with the existing moderation rules.";
    const detail = moderation.error ? `${fallback} ${moderation.error}` : fallback;

    return locale === "zh"
      ? {
          heading: "AI 审核记录",
          label: "审核失败",
          detail,
        }
      : {
          heading: "AI review record",
          label: "Failed",
          detail,
        };
  }

  const label = aiModerationDecisionLabel(moderation.decision, locale);
  const detail =
    moderation.reason ||
    (locale === "zh" ? "模型未返回具体理由。" : "The model did not return a specific reason.");

  return locale === "zh"
    ? {
        heading: "AI 审核记录",
        label,
        detail,
      }
    : {
        heading: "AI review record",
        label,
        detail,
      };
}

function aiModerationDecisionLabel(
  decision: NonNullable<Comment["aiModeration"]>["decision"],
  locale: "en" | "zh",
) {
  if (locale === "zh") {
    if (decision === "approve") return "建议通过";
    if (decision === "spam") return "判为垃圾";
    return "建议复核";
  }

  if (decision === "approve") return "Approve";
  if (decision === "spam") return "Spam";
  return "Review";
}

function formatAiModerationDate(value: string, locale: "en" | "zh") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function commentStatusLabel(status: Comment["status"]) {
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

function getCommentsActionCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      actionError: (action: ModerationAction) =>
        action === "approve" ? "评论通过失败" : action === "spam" ? "评论标记失败" : "评论删除失败",
      actionSuccess: (action: ModerationAction) =>
        action === "approve" ? "评论已通过" : action === "spam" ? "评论已标记为垃圾" : "评论已删除",
      batchPartial: (action: ModerationAction, successCount: number, total: number) =>
        `${successCount}/${total} 条评论处理成功：${action === "approve" ? "通过" : action === "spam" ? "标记垃圾" : "删除"}`,
      batchSuccess: (action: ModerationAction, count: number) =>
        `${count} 条评论已${action === "approve" ? "通过" : action === "spam" ? "标记为垃圾" : "删除"}`,
      networkError: "网络异常，请稍后再试。",
    };
  }

  return {
    actionError: (action: ModerationAction) =>
      action === "approve"
        ? "Comment could not be approved"
        : action === "spam"
          ? "Comment could not be marked as spam"
          : "Comment could not be deleted",
    actionSuccess: (action: ModerationAction) =>
      action === "approve"
        ? "Comment approved"
        : action === "spam"
          ? "Comment marked as spam"
          : "Comment deleted",
    batchPartial: (action: ModerationAction, successCount: number, total: number) =>
      `${successCount}/${total} comments updated: ${
        action === "approve" ? "approve" : action === "spam" ? "mark spam" : "delete"
      }`,
    batchSuccess: (action: ModerationAction, count: number) =>
      `${count} comments ${
        action === "approve" ? "approved" : action === "spam" ? "marked as spam" : "deleted"
      }`,
    networkError: "Network error. Try again in a moment.",
  };
}
