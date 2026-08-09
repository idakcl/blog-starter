import { type ContentStatus, type Post } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, FileTextIcon, GitBranchIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { AdminPageHeader, adminPanelClassName } from "#/components/admin/admin-ui";
import { PostForm } from "#/components/admin/post-form";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

const defaultMarkdown = "# New post\n\nStart writing in Markdown.";
const aiSettingsEndpoint = "/api/admin/ai-settings";
const aiPublishNoticeStorageKey = "blogcms:ai-publish-automation-notice-dismissed";

interface PostEditorPageProps {
  postId?: string;
}

type PostLoadResult =
  | { postId: string; state: "ready"; post: Post }
  | { postId: string; state: "error" | "not-found" };

export function PostEditorPage({ postId }: PostEditorPageProps) {
  const locale = getCurrentLocale();
  const copy = getPostEditorCopy(locale);
  const navigate = useNavigate();
  const router = useRouter();
  const [loadResult, setLoadResult] = useState<PostLoadResult | null>(null);
  const [editorMode, setEditorMode] = useState<"editor" | "source" | "preview">("editor");
  const [editorState, setEditorState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [aiAutomationConfigured, setAiAutomationConfigured] = useState(false);
  const [showAiPublishNotice, setShowAiPublishNotice] = useState(false);
  const [dismissAiPublishNotice, setDismissAiPublishNotice] = useState(false);
  const [fallbackPublishedAtIso] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );

  useEffect(() => {
    if (!postId) {
      return;
    }

    let ignore = false;

    void fetch(`/api/posts/${encodeURIComponent(postId)}?lang=${locale}`)
      .then(async (response) => {
        if (response.status === 404) {
          return { state: "not-found" as const };
        }

        if (!response.ok) {
          return { state: "error" as const };
        }

        const payload = (await response.json()) as { data?: Post };

        return payload.data
          ? { state: "ready" as const, post: payload.data }
          : { state: "error" as const };
      })
      .then((result) => {
        if (ignore) {
          return;
        }

        if (result.state === "ready" && "post" in result) {
          setLoadResult({ postId, state: "ready", post: result.post });
          setMarkdown(result.post.contentMarkdown);
          setEditorState("idle");
          return;
        }

        setLoadResult({ postId, state: result.state });
      })
      .catch(() => {
        if (!ignore) {
          setLoadResult({ postId, state: "error" });
        }
      });

    return () => {
      ignore = true;
    };
  }, [locale, postId]);

  useEffect(() => {
    let ignore = false;

    void fetch(aiSettingsEndpoint)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        if (!ignore) {
          setAiAutomationConfigured(normalizeAiAutomationConfigured(payload));
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  const currentLoadResult = postId && loadResult?.postId === postId ? loadResult : null;
  const editingPost =
    currentLoadResult?.state === "ready" && "post" in currentLoadResult
      ? currentLoadResult.post
      : null;
  const loadState = postId ? (currentLoadResult?.state ?? "loading") : "ready";
  const pageTitle = postId ? m.admin_editor_edit_title() : m.admin_new_post();

  const submitEditorForm = async ({
    formData,
    status,
  }: {
    formData: FormData;
    status: ContentStatus;
  }) => {
    setEditorState("saving");
    const endpoint = editingPost
      ? `/api/posts/${editingPost.id}?lang=${locale}`
      : `/api/posts?lang=${locale}`;
    const tagsValue = formData.get("tags");
    const publishedAtValue = formData.get("publishedAt");
    const publishedAt =
      status === "published"
        ? new Date().toISOString()
        : typeof publishedAtValue === "string"
          ? datetimeLocalToIso(publishedAtValue)
          : undefined;

    const response = await fetch(endpoint, {
      method: editingPost ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        excerpt: formData.get("excerpt"),
        coverImage: formData.get("coverImage"),
        contentMarkdown: markdown,
        status,
        publishedAt,
        featured: formData.get("featured") === "on",
        pinned: formData.get("pinned") === "on",
        commentsEnabled: formData.get("commentsEnabled") === "on",
        seriesId: formData.get("seriesId") || null,
        tags: parseTagNames(typeof tagsValue === "string" ? tagsValue : ""),
        locale,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setEditorState("error");
      toast.error(copy.failed(status), {
        description: response
          ? await getResponseErrorMessage(response, copy.failed(status))
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: Post };

    setMarkdown(payload.data.contentMarkdown);
    setEditorState("saved");
    await router.invalidate();

    if (postId) {
      setLoadResult({ postId, state: "ready", post: payload.data });
    }

    if (status === "published") {
      toast.success(copy.published, { description: copy.openingPost });
      void navigate({
        to: "/blog/$slug",
        params: { slug: payload.data.slug },
      });
      return;
    }

    toast.success(copy.saved(status));

    if (!postId) {
      void navigate({
        to: "/admin/posts/$postId",
        params: { postId: payload.data.id },
        replace: true,
      });
    }
  };

  const handleEditorSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = (submitter?.value as ContentStatus | undefined) ?? "draft";

    if (
      status === "published" &&
      aiAutomationConfigured &&
      editingPost?.status !== "published" &&
      !hasDismissedAiPublishNotice()
    ) {
      setDismissAiPublishNotice(false);
      setShowAiPublishNotice(true);
    }

    await submitEditorForm({ formData, status });
  };

  const closeAiPublishNotice = () => {
    if (dismissAiPublishNotice) {
      rememberAiPublishNoticeDismissed();
    }

    setShowAiPublishNotice(false);
  };

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={pageTitle}
        actions={
          <Button
            render={<Link to="/admin/posts" />}
            nativeButton={false}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon />
            {m.admin_nav_posts()}
          </Button>
        }
      />

      {showAiPublishNotice ? (
        <AiPublishNoticeModal
          locale={locale}
          dismissChecked={dismissAiPublishNotice}
          onDismissCheckedChange={setDismissAiPublishNotice}
          onClose={closeAiPublishNotice}
        />
      ) : null}

      {loadState === "loading" ? (
        <div
          aria-label={locale === "zh" ? "正在加载文章" : "Loading post"}
          className={`${adminPanelClassName} h-96 animate-pulse`}
        />
      ) : null}

      {loadState === "error" ? (
        <p className={`${adminPanelClassName} text-sm text-destructive`}>
          {m.admin_editor_error()}
        </p>
      ) : null}

      {loadState === "not-found" ? (
        <p className={`${adminPanelClassName} text-sm text-muted-foreground`}>
          {locale === "zh" ? "找不到这篇文章。" : "Post not found."}
        </p>
      ) : null}

      {loadState === "ready" && editingPost?.externalSource?.kind === "obsidian_git" ? (
        <ObsidianReadOnlyPanel post={editingPost} locale={locale} />
      ) : null}

      {loadState === "ready" && editingPost?.externalSource?.kind !== "obsidian_git" ? (
        <PostForm
          editingPost={editingPost}
          editorMode={editorMode}
          editorState={editorState}
          markdown={markdown}
          fallbackPublishedAtIso={fallbackPublishedAtIso}
          onEditorModeChange={setEditorMode}
          onMarkdownChange={setMarkdown}
          onSubmit={handleEditorSubmit}
        />
      ) : null}
    </section>
  );
}

function ObsidianReadOnlyPanel({ locale, post }: { locale: "en" | "zh"; post: Post }) {
  const source = post.externalSource;
  const copy =
    locale === "zh"
      ? {
          body: "这篇文章来自 Git 管理的 Markdown 文件。后台会展示它，但修改、删除和重新发布都以源文件为准。",
          heading: "这篇文章由 Markdown 文件同步",
          openPost: "查看公开文章",
          sourceLabel: "源文件",
          syncHint: "修改源文件后，提交并重新部署即可更新网站。",
        }
      : {
          body: "This post comes from a Git-managed Markdown file. The admin can display it, but edits, deletion, and republishing are controlled by the source file.",
          heading: "Synced from Markdown",
          openPost: "View public post",
          sourceLabel: "Source file",
          syncHint: "Edit the source file, commit it, and deploy again to update the site.",
        };

  return (
    <div className={`${adminPanelClassName} grid gap-5`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-link">
          <GitBranchIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{copy.heading}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/35 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileTextIcon className="size-4" />
          {copy.sourceLabel}
        </div>
        <p className="mt-2 font-mono text-sm break-all text-muted-foreground">
          {source?.path ?? "-"}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy.syncHint}</p>
      </div>

      <div>
        <Button
          render={<Link to="/blog/$slug" params={{ slug: post.slug }} />}
          nativeButton={false}
        >
          {copy.openPost}
        </Button>
      </div>
    </div>
  );
}

function AiPublishNoticeModal({
  dismissChecked,
  locale,
  onDismissCheckedChange,
  onClose,
}: {
  dismissChecked: boolean;
  locale: "en" | "zh";
  onDismissCheckedChange: (checked: boolean) => void;
  onClose: () => void;
}) {
  const copy = getAiPublishNoticeCopy(locale);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-publish-notice-title"
        className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-link">
            <SparklesIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 id="ai-publish-notice-title" className="text-lg font-semibold">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {copy.items.map((item) => (
            <span
              key={item}
              className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs font-medium text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>

        <label className="mt-5 flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dismissChecked}
            onChange={(event) => onDismissCheckedChange(event.currentTarget.checked)}
            className="size-4 rounded border-input"
          />
          {copy.doNotRemind}
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onClose}>
            {copy.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

function parseTagNames(value: string) {
  return value
    .split(/[,\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function datetimeLocalToIso(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function hasDismissedAiPublishNotice() {
  try {
    return window.localStorage.getItem(aiPublishNoticeStorageKey) === "true";
  } catch {
    return false;
  }
}

function rememberAiPublishNoticeDismissed() {
  try {
    window.localStorage.setItem(aiPublishNoticeStorageKey, "true");
  } catch {
    // Ignore storage errors so publishing remains available.
  }
}

function normalizeAiAutomationConfigured(payload: unknown) {
  const root = asRecord(payload);
  const record = asRecord(root?.data) ?? root;

  if (!record) {
    return false;
  }

  const configured = readBoolean(record, ["configured", "enabled", "ready"]);
  const apiKeyConfigured =
    readBoolean(record, ["apiKeyConfigured", "hasApiKey", "keyConfigured"]) ?? configured ?? false;
  const model = readString(record, ["model", "modelName"]);

  return configured ?? Boolean(apiKeyConfigured && model);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function readBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function getAiPublishNoticeCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      confirm: "知道了",
      description: "发布后会自动生成摘要、Slug 和标签，并同步生成英文版本。",
      doNotRemind: "不再提醒",
      items: ["摘要", "Slug 和标签", "英文版本"],
      title: "发布时会自动补全文章信息",
    };
  }

  return {
    confirm: "Got it",
    description:
      "Publishing will automatically generate the summary, slug, tags, and English version.",
    doNotRemind: "Do not remind me again",
    items: ["Summary", "Slug and tags", "English version"],
    title: "Publishing will complete post details automatically",
  };
}

function getPostEditorCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      failed: (status: ContentStatus) =>
        status === "published"
          ? "文章发布失败"
          : status === "scheduled"
            ? "定时发布失败"
            : "草稿保存失败",
      networkError: "网络异常，请稍后再试。",
      openingPost: "正在打开公开文章。",
      published: "文章已发布",
      saved: (status: ContentStatus) => (status === "scheduled" ? "文章已定时发布" : "草稿已保存"),
    };
  }

  return {
    failed: (status: ContentStatus) =>
      status === "published"
        ? "Post could not be published"
        : status === "scheduled"
          ? "Post could not be scheduled"
          : "Draft could not be saved",
    networkError: "Network error. Try again in a moment.",
    openingPost: "Opening the public post.",
    published: "Post published",
    saved: (status: ContentStatus) => (status === "scheduled" ? "Post scheduled" : "Draft saved"),
  };
}
