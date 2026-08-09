import type { Comment, EmailPreference } from "@repo/core";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Link } from "@tanstack/react-router";
import { CheckIcon, LoaderCircleIcon, LogInIcon, LogOutIcon, MailIcon } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";

import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

type CommentFormProps = {
  readonly postSlug: string;
  readonly turnstileSiteKey?: string | null;
  readonly parentId?: string | null;
  readonly replyingTo?: string | null;
  readonly onCancelReply?: () => void;
  readonly onCommentCreated?: (comment: Comment) => void;
};

type SubmitState = "idle" | "submitting" | "success" | "error";
type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;
const ERROR_MESSAGES: Record<number, string> = {
  400: "请求参数有误，请检查输入",
  429: "评论太频繁，请稍后再试",
  403: "评论功能已被限制",
  500: "服务器错误，请稍后重试",
};

type CommentAuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: "email" | "github" | "google";
  commentStatus?: "active" | "muted";
  commentReplyNotificationsEnabled: boolean;
  emailPreference: EmailPreference;
  marketingOptOut: boolean;
};

export function CommentForm({
  onCancelReply,
  onCommentCreated,
  parentId,
  postSlug,
  replyingTo,
  turnstileSiteKey,
}: CommentFormProps) {
  const [state, setState] = useState<SubmitState>("idle");
  const [submittedStatus, setSubmittedStatus] = useState<Comment["status"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<CommentAuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailPreferenceStatus, setEmailPreferenceStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const emailCopy = getCommentEmailPreferenceCopy(getCurrentLocale());

  useEffect(() => {
    let ignore = false;

    void fetch("/api/comment-auth/me", { credentials: "same-origin" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { data?: CommentAuthUser | null }) : undefined,
      )
      .then((payload) => {
        if (!ignore) {
          setUser(payload?.data ?? null);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAuthLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setSubmittedStatus(null);
    setErrorMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const turnstileToken = turnstileSiteKey ? formData.get("cf-turnstile-response") : undefined;

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postSlug,
          body: formData.get("body"),
          ...(parentId ? { parentId } : {}),
          honeypot: formData.get("company"),
          turnstileToken,
        }),
      });

      if (!response.ok) {
        setState("error");
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(ERROR_MESSAGES[response.status] || errorBody.error || "评论提交失败");
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { data?: Comment };

      if (payload.data) {
        setSubmittedStatus(payload.data.status);
        onCommentCreated?.(payload.data);
      }

      setState("success");
      form.reset();
      onCancelReply?.();
    } catch {
      setState("error");
      setErrorMessage("网络错误，请检查网络后重试");
    }
  };

  const updateEmailPreference = async (
    input: Partial<Pick<CommentAuthUser, "commentReplyNotificationsEnabled" | "emailPreference">>,
  ) => {
    setEmailPreferenceStatus("saving");
    const response = await fetch("/api/account/email-preferences", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).catch(() => null);

    if (!response?.ok) {
      setEmailPreferenceStatus("idle");
      return;
    }

    const payload = (await response.json()) as {
      data?: {
        commentReplyNotificationsEnabled: boolean;
        emailPreference: EmailPreference;
        marketingOptOut: boolean;
      };
    };

    if (payload.data) {
      setUser((current) => (current ? { ...current, ...payload.data } : current));
    }

    setEmailPreferenceStatus("saved");
    window.setTimeout(() => setEmailPreferenceStatus("idle"), 1800);
  };

  const handleLogout = async () => {
    await fetch("/api/comment-auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        {m.comment_auth_loading()}
      </div>
    );
  }

  if (user?.commentStatus === "muted") {
    return (
      <div className="mt-6 rounded-md border border-border bg-muted/35 p-4">
        <h3 className="font-semibold">{m.comment_account_muted()}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {m.comment_account_muted_description()}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void handleLogout()}
        >
          <LogOutIcon className="size-4" />
          {m.sign_out()}
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <GuestCommentForm
        {...{ onCancelReply, onCommentCreated, parentId, postSlug, replyingTo, turnstileSiteKey }}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid gap-4 rounded-md border border-border bg-background p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 text-sm">
        <span className="text-muted-foreground">{m.comment_signed_in_as({ name: user.name })}</span>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center gap-1 font-medium text-link hover:underline"
        >
          <LogOutIcon className="size-3.5" />
          {m.sign_out()}
        </button>
      </div>
      <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.6fr)] sm:items-center">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MailIcon className="mt-0.5 size-4 text-link" />
          <div>
            <p className="font-medium text-foreground">{emailCopy.title}</p>
            <p className="mt-1 text-xs leading-5">{emailCopy.description}</p>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={emailCopy.title}>
            {emailCopy.options.map((option) => {
              const selected = user.emailPreference === option.value;

              return (
                <label
                  key={option.value}
                  className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-medium transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/45"
                  } ${
                    emailPreferenceStatus === "saving"
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="comment-email-preference"
                    value={option.value}
                    checked={selected}
                    disabled={emailPreferenceStatus === "saving"}
                    onChange={() => void updateEmailPreference({ emailPreference: option.value })}
                    className="sr-only"
                  />
                  {selected ? <CheckIcon className="size-3.5" /> : null}
                  {option.label}
                </label>
              );
            })}
          </div>
          {emailPreferenceStatus === "saved" ? (
            <p className="text-xs text-success">{emailCopy.saved}</p>
          ) : null}
          <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={user.commentReplyNotificationsEnabled}
              disabled={emailPreferenceStatus === "saving"}
              onChange={(event) =>
                void updateEmailPreference({
                  commentReplyNotificationsEnabled: event.currentTarget.checked,
                })
              }
              className="mt-0.5 size-3.5 rounded border-input accent-primary"
            />
            <span>{emailCopy.commentReplies}</span>
          </label>
        </div>
      </div>
      {replyingTo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 text-sm text-muted-foreground">
          <span>{m.comment_replying_to({ name: replyingTo })}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="font-medium text-link hover:underline"
          >
            {m.comment_cancel_reply()}
          </button>
        </div>
      ) : null}
      <div className="hidden">
        <Label htmlFor="comment-company">{m.comment_company()}</Label>
        <Input id="comment-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="comment-body">{m.comment_body()}</Label>
        <textarea
          id="comment-body"
          name="body"
          required
          minLength={2}
          maxLength={4000}
          className="min-h-32 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      {turnstileSiteKey ? (
        <div>
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? m.comment_submitting() : m.submit_comment()}
        </Button>
        {state === "success" ? (
          <p className="text-sm text-success">
            {submittedStatus === "approved" ? m.comment_success() : m.comment_pending_success()}
          </p>
        ) : null}
        {state === "error" ? (
          <p className="text-sm text-destructive">{errorMessage || m.comment_error()}</p>
        ) : null}
      </div>
    </form>
  );
}

function commentLoginRedirect(postSlug: string) {
  return typeof window === "undefined"
    ? `/blog/${postSlug}#comments`
    : `${window.location.pathname}${window.location.search}#comments`;
}

function GuestCommentForm({
  onCancelReply,
  onCommentCreated,
  parentId,
  postSlug,
  replyingTo,
  turnstileSiteKey,
}: Omit<CommentFormProps, "state" | "setState" | "setSubmittedStatus">) {
  const [state, setState] = useState<SubmitState>("idle");
  const [submittedStatus, setSubmittedStatus] = useState<Comment["status"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGuestSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();
    if (state === "submitting") return;

    setState("submitting");
    setSubmittedStatus(null);
    setErrorMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const turnstileToken = turnstileSiteKey ? formData.get("cf-turnstile-response") : undefined;
    const guestName = (formData.get("guestName") as string)?.trim();

    if (!guestName) {
      setState("error");
      setErrorMessage("请输入显示名称");
      return;
    }

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postSlug,
          body: formData.get("body"),
          guestName,
          ...(parentId ? { parentId } : {}),
          honeypot: formData.get("company"),
          turnstileToken,
        }),
      });

      if (!response.ok) {
        setState("error");
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(ERROR_MESSAGES[response.status] || errorBody.error || "评论提交失败");
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { data?: Comment };

      if (payload.data) {
        setSubmittedStatus(payload.data.status);
        onCommentCreated?.(payload.data);
      }

      setState("success");
      form.reset();
      onCancelReply?.();
    } catch {
      setState("error");
      setErrorMessage("网络错误，请检查网络后重试");
    }
  };

  return (
    <form
      onSubmit={handleGuestSubmit}
      className="mt-6 grid gap-4 rounded-md border border-border bg-background p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 text-sm">
        <span className="text-muted-foreground">以游客身份评论</span>
        <Link
          to="/login"
          search={{ redirectTo: commentLoginRedirect(postSlug) }}
          className="inline-flex items-center gap-1 font-medium text-link hover:underline"
        >
          <LogInIcon className="size-3.5" />
          登录
        </Link>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="guest-name">显示名称</Label>
        <Input
          id="guest-name"
          name="guestName"
          required
          minLength={1}
          maxLength={60}
          placeholder="你的昵称"
          className="max-w-xs"
        />
      </div>
      {replyingTo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 text-sm text-muted-foreground">
          <span>{m.comment_replying_to({ name: replyingTo })}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="font-medium text-link hover:underline"
          >
            {m.comment_cancel_reply()}
          </button>
        </div>
      ) : null}
      <div className="hidden">
        <Label htmlFor="comment-company">{m.comment_company()}</Label>
        <Input id="comment-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="comment-body">{m.comment_body()}</Label>
        <textarea
          id="comment-body"
          name="body"
          required
          minLength={2}
          maxLength={4000}
          className="min-h-32 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      {turnstileSiteKey ? (
        <div>
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? m.comment_submitting() : m.submit_comment()}
        </Button>
        {state === "success" ? (
          <p className="text-sm text-success">
            {submittedStatus === "approved" ? m.comment_success() : m.comment_pending_success()}
          </p>
        ) : null}
        {state === "error" ? (
          <p className="text-sm text-destructive">{errorMessage || m.comment_error()}</p>
        ) : null}
      </div>
    </form>
  );
}

function getCommentEmailPreferenceCopy(locale: ReturnType<typeof getCurrentLocale>) {
  if (locale === "zh") {
    return {
      commentReplies: "有人回复我的评论时通知我",
      description: "选择这个账号是否接收每周博客更新。",
      options: [
        { label: "不订阅", value: "none" },
        { label: "每周更新", value: "weekly_blog_updates" },
      ] satisfies Array<{ label: string; value: EmailPreference }>,
      saved: "邮件偏好已保存",
      title: "博客更新邮件",
      weekly: "订阅每周博客更新",
      weeklyDescription: "每周汇总新文章发送到邮箱。",
    };
  }

  return {
    commentReplies: "Notify me when someone replies to my comments",
    description: "Choose whether this account receives weekly blog updates.",
    options: [
      { label: "No email", value: "none" },
      { label: "Weekly", value: "weekly_blog_updates" },
    ] satisfies Array<{ label: string; value: EmailPreference }>,
    saved: "Email preference saved",
    title: "Blog update emails",
    weekly: "Subscribe to weekly blog updates",
    weeklyDescription: "Get a weekly email with the latest posts.",
  };
}
