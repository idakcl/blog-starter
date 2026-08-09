import { createFileRoute } from "@tanstack/react-router";

import { unsubscribeCommentReplyEmails } from "#/lib/comment-reply-notifications";
import { unsubscribeOptionalEmails } from "#/lib/email-notifications";

export const Route = createFileRoute("/api/email/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const kind =
          url.searchParams.get("type") === "comment_replies" ? "comment_replies" : "optional";
        const ok = token
          ? kind === "comment_replies"
            ? await unsubscribeCommentReplyEmails(token)
            : await unsubscribeOptionalEmails(token)
          : false;

        return new Response(unsubscribeHtml(ok, kind, localeFromRequest(request)), {
          headers: { "content-type": "text/html; charset=utf-8" },
          status: ok ? 200 : 400,
        });
      },
    },
  },
});

function unsubscribeHtml(ok: boolean, kind: "comment_replies" | "optional", locale: "en" | "zh") {
  const title =
    locale === "zh"
      ? ok
        ? "邮件订阅已取消"
        : "退订链接已失效"
      : ok
        ? "Email unsubscribed"
        : "Unsubscribe link expired";
  const body = getUnsubscribeBody(ok, kind, locale);
  const home = locale === "zh" ? "返回网站" : "Return to the site";

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafafa; color: #111; }
      main { width: min(92vw, 520px); border: 1px solid #ddd; border-radius: 8px; background: #fff; padding: 28px; box-shadow: 0 12px 36px rgb(0 0 0 / 8%); }
      h1 { margin: 0; font-size: 24px; line-height: 1.2; }
      p { margin: 12px 0 0; line-height: 1.6; color: #555; }
      a { color: #0f766e; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
      <p><a href="/">${home}</a></p>
    </main>
  </body>
</html>`;
}

function getUnsubscribeBody(
  ok: boolean,
  kind: "comment_replies" | "optional",
  locale: "en" | "zh",
) {
  if (locale === "zh") {
    if (!ok) {
      return "这个退订链接无效或已过期。登录后可以在账号中心更新邮件偏好。";
    }

    if (kind === "comment_replies") {
      return "你将不再收到评论回复邮件通知。";
    }

    return "你将不再收到可选的博客更新或产品通知邮件。";
  }

  if (!ok) {
    return "This unsubscribe link is invalid or has expired. You can update email preferences after signing in.";
  }

  if (kind === "comment_replies") {
    return "You will no longer receive email notifications when someone replies to your comments.";
  }

  return "You will no longer receive optional blog update or announcement emails.";
}

function localeFromRequest(request: Request): "en" | "zh" {
  const language = request.headers.get("accept-language")?.toLowerCase() ?? "";

  return language.includes("zh") ? "zh" : "en";
}
