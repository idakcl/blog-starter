---
title: 进阶配置
description: 可选的邮件、评论 OAuth 和 Turnstile 配置。
---

> **这个页面是给帮你配置网站的技术人员看的。** 如果你是网站的所有者但不亲自动手配置，可以把这个页面分享给你的技术伙伴。

这些配置都是**可选的**。不配置它们，你的博客照样能发布文章、接收评论。只有当你需要以下额外能力时，才需要设置。

| 配置项       | 一句话解释                                           |
| ------------ | ---------------------------------------------------- |
| 邮件发送     | 让网站能发邮件（比如通知你有新评论、发密码重置链接） |
| GitHub OAuth | 让读者用 GitHub 账号一键登录来评论                   |
| Google OAuth | 让读者用 Google 账号一键登录来评论                   |
| Turnstile    | 防机器人的验证码（像"我不是机器人"那种）             |

修改 Cloudflare vars、secrets 或 bindings 后，重新部署 Worker，再刷新 `/admin/settings`。

---

## 邮件发送

**让你的网站能发邮件** — 比如通知你有新评论、给读者发密码重置链接、发送备份完成通知。

配置邮件发送之后，博客可以：

- 有读者提交新评论时，给管理员发送邮件提醒
- 给管理员账号发送密码重置链接
- 发送导入、导出和备份完成通知
- 在后台开启邮箱密码评论账号的邮箱验证

> 不需要这些功能？保持关闭即可。核心发布和评论流程会继续正常工作。

### Cloudflare Email Service

在 `apps/web/wrangler.jsonc` 添加名为 `CMS_EMAIL` 的邮件 binding，并开启发送变量：

```jsonc
{
  "send_email": [
    {
      "name": "CMS_EMAIL",
      "allowed_sender_addresses": ["noreply@your-domain.com"],
    },
  ],
  "vars": {
    "CMS_EMAIL_SENDING_ENABLED": "true",
    "CMS_EMAIL_FROM": "noreply@your-domain.com",
    "CMS_EMAIL_TO": "you@your-domain.com",
  },
}
```

`CMS_EMAIL_FROM` 是发件地址。`CMS_EMAIL_TO` 用于接收没有指定收件人的后台通知。

### Resend

也可以用 Resend 替代 Cloudflare binding。先添加发件地址和 API key：

```jsonc
{
  "vars": {
    "RESEND_FROM_EMAIL": "noreply@your-domain.com",
  },
}
```

```sh
pnpm --filter @repo/web exec wrangler secret put RESEND_API_KEY --config wrangler.jsonc
```

检测到 Cloudflare Email Service 或 Resend 后，后台设置页才允许开启新的邮箱密码评论账号邮箱验证。

---

## GitHub OAuth

**让读者用 GitHub 账号一键登录来评论** — 不配置的话，邮箱和密码登录仍然可用。

每个需要独立 callback URL 的环境创建一个 GitHub OAuth app。GitHub OAuth app 只有一个 authorization callback URL，所以本地和生产通常使用两个 OAuth app。

Callback URL：

```txt
http://localhost:3000/api/auth/callback/github
https://your-domain.com/api/auth/callback/github
```

把 client id 和 client secret 都保存为 Wrangler secret：

```sh
pnpm --filter @repo/web exec wrangler secret put GITHUB_CLIENT_ID --config wrangler.jsonc
pnpm --filter @repo/web exec wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.jsonc
```

本地开发时，把两个值放入 `apps/web/.env`。

---

## Google OAuth

**让读者用 Google 账号一键登录来评论** — 不配置的话，邮箱密码登录和已配置的 GitHub 登录仍然可用。

创建 Google OAuth client，并把 callback URL 加到 authorized redirect URIs：

```txt
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

把 client id 和 client secret 都保存为 Wrangler secret：

```sh
pnpm --filter @repo/web exec wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
pnpm --filter @repo/web exec wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
```

本地开发时，把两个值放入 `apps/web/.env`。

---

## Cloudflare Turnstile

**防机器人的验证码** — 像网页上"我不是机器人"那种验证。不配置的话，评论仍然需要读者会话，并继续使用服务端限流和审核。

在 Cloudflare 创建 Turnstile widget，并允许博客运行的域名。Widget 会提供两个值：

- **site key**：给浏览器使用的公开 key
- **secret key**：给 Worker 服务端校验 token 使用的私密 key

把公开 site key 放到 Wrangler var：

```jsonc
{
  "vars": {
    "VITE_TURNSTILE_SITE_KEY": "your-site-key",
  },
}
```

把 secret key 写成 Wrangler secret：

```sh
pnpm --filter @repo/web exec wrangler secret put CMS_TURNSTILE_SECRET_KEY --config wrangler.jsonc
```

只有同时存在 `VITE_TURNSTILE_SITE_KEY` 和 `CMS_TURNSTILE_SECRET_KEY` 时，评论提交才会启用 Turnstile 校验。

---

## 查看状态

打开 `/admin/settings`，查看进阶配置状态。后台检测内容：

- 邮件发送：`CMS_EMAIL` binding 加邮件变量，或 Resend 变量和 secret
- GitHub OAuth：`GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`
- Google OAuth：`GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- Turnstile：`VITE_TURNSTILE_SITE_KEY` 和 `CMS_TURNSTILE_SECRET_KEY`

外部参考：

- [Cloudflare Email Service Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Cloudflare Turnstile get started](https://developers.cloudflare.com/turnstile/get-started/)
- [GitHub OAuth app setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Google OAuth client setup](https://support.google.com/cloud/answer/6158849)
