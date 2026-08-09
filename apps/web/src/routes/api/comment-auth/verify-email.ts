import { createFileRoute } from "@tanstack/react-router";

import { confirmCommentEmailVerification } from "#/lib/email-verification";

export const Route = createFileRoute("/api/comment-auth/verify-email")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const result = await confirmCommentEmailVerification({
          token: url.searchParams.get("token") ?? "",
          userId: url.searchParams.get("userId") ?? "",
        }).catch(() => ({ ok: false as const }));

        return new Response(renderVerificationPage(result.ok, localeFromRequest(request)), {
          headers: {
            "cache-control": "no-store",
            "content-type": "text/html; charset=utf-8",
          },
          status: result.ok ? 200 : 400,
        });
      },
    },
  },
});

function renderVerificationPage(success: boolean, locale: "en" | "zh") {
  const copy =
    locale === "zh"
      ? {
          body: success
            ? "邮箱已验证。你可以返回文章页面继续登录和评论。"
            : "这个验证链接无效或已过期。请重新注册或重新发送验证邮件。",
          home: "返回网站",
          title: success ? "邮箱已验证" : "验证链接已失效",
        }
      : {
          body: success
            ? "Your email address is verified. You can return to the article and sign in."
            : "This verification link is invalid or expired. Create the account again or resend the verification email.",
          home: "Return to site",
          title: success ? "Email verified" : "Verification link expired",
        };

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.title}</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f5ef; color: #1f2933; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    section { max-width: 460px; border: 1px solid #ded8cb; border-radius: 12px; background: #fffaf1; padding: 28px; box-shadow: 0 20px 45px rgba(31, 41, 51, 0.08); }
    h1 { margin: 0; font-size: 24px; line-height: 1.2; }
    p { margin: 12px 0 0; color: #52616b; line-height: 1.6; }
    a { display: inline-flex; margin-top: 20px; color: #0f766e; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>${copy.title}</h1>
      <p>${copy.body}</p>
      <a href="/">${copy.home}</a>
    </section>
  </main>
</body>
</html>`;
}

function localeFromRequest(request: Request): "en" | "zh" {
  const language = request.headers.get("accept-language")?.toLowerCase() ?? "";

  return language.includes("zh") ? "zh" : "en";
}
