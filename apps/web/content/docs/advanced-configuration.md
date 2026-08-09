---
title: Advanced Configuration
description: Optional email, comment OAuth, and Turnstile setup.
---

> **This page is for the technical person helping you set up your website.** If you own the site but aren't doing the configuration yourself, share this page with your tech partner.

All of these configurations are **optional**. Your blog can publish posts and accept comments without any of them. You only need to set these up when you want the extra capabilities below.

| Feature        | What it does in one sentence                                                             |
| -------------- | ---------------------------------------------------------------------------------------- |
| Email delivery | Lets your site send emails (e.g., notify you of new comments, send password reset links) |
| GitHub OAuth   | Lets readers sign in with their GitHub account to leave comments                         |
| Google OAuth   | Lets readers sign in with their Google account to leave comments                         |
| Turnstile      | Bot protection for comments (the "I'm not a robot" kind of check)                        |

After changing Cloudflare vars, secrets, or bindings, redeploy the Worker and refresh `/admin/settings`.

---

## Email Delivery

**Lets your website send emails** — for example, notifying you about new comments, sending password reset links to readers, or confirming that a backup finished.

After email delivery is configured, the blog can:

- Send an admin email when a reader submits a new comment
- Send password reset links for admin accounts
- Send import, export, and backup completion notices
- Support email verification for email/password comment accounts

> Don't need these features? Leave email delivery disabled. The core publishing and comment workflows continue to work fine.

### Cloudflare Email Service

Add an email binding named `CMS_EMAIL` and enable sending vars in `apps/web/wrangler.jsonc`:

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

`CMS_EMAIL_FROM` is the sender address. `CMS_EMAIL_TO` receives admin notices when an action does not provide a more specific recipient.

### Resend

Use Resend instead of the Cloudflare binding by adding a from address and API key:

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

When either Cloudflare Email Service or Resend is detected, the admin settings page can enable email verification for new email/password comment accounts.

---

## GitHub OAuth

**Lets readers sign in with their GitHub account to leave comments** — email/password login remains available when this isn't configured.

Create a GitHub OAuth app for each environment that needs its own callback URL. GitHub OAuth apps have one authorization callback URL, so local and production usually use separate OAuth apps.

Callback URLs:

```txt
http://localhost:3000/api/auth/callback/github
https://your-domain.com/api/auth/callback/github
```

Store the client id and client secret as Wrangler secrets:

```sh
pnpm --filter @repo/web exec wrangler secret put GITHUB_CLIENT_ID --config wrangler.jsonc
pnpm --filter @repo/web exec wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.jsonc
```

For local development, put both values in `apps/web/.env`.

---

## Google OAuth

**Lets readers sign in with their Google account to leave comments** — email/password and any configured GitHub login remain available when this isn't configured.

Create a Google OAuth client and add the callback URLs as authorized redirect URIs:

```txt
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

Store the client id and client secret as Wrangler secrets:

```sh
pnpm --filter @repo/web exec wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
pnpm --filter @repo/web exec wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
```

For local development, put both values in `apps/web/.env`.

---

## Cloudflare Turnstile

**Bot protection for comments** — like the "I'm not a robot" checks you see on other websites. Comments still require a reader session and use server-side rate limits and moderation when Turnstile is not configured.

Create a Turnstile widget in Cloudflare and allow the hostnames where your blog runs. The widget gives you two values:

- **site key**: public key used by the browser
- **secret key**: private key used by the Worker to validate tokens

Set the public site key as a Wrangler var:

```jsonc
{
  "vars": {
    "VITE_TURNSTILE_SITE_KEY": "your-site-key",
  },
}
```

Store the secret key as a Wrangler secret:

```sh
pnpm --filter @repo/web exec wrangler secret put CMS_TURNSTILE_SECRET_KEY --config wrangler.jsonc
```

Turnstile is only enforced when both `VITE_TURNSTILE_SITE_KEY` and `CMS_TURNSTILE_SECRET_KEY` are present.

---

## Check Status

Open `/admin/settings` and review Advanced configuration. The status checks:

- Email delivery: `CMS_EMAIL` binding plus email vars, or Resend vars and secret
- GitHub OAuth: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Google OAuth: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Turnstile: `VITE_TURNSTILE_SITE_KEY` and `CMS_TURNSTILE_SECRET_KEY`

External references:

- [Cloudflare Email Service Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Cloudflare Turnstile get started](https://developers.cloudflare.com/turnstile/get-started/)
- [GitHub OAuth app setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Google OAuth client setup](https://support.google.com/cloud/answer/6158849)
