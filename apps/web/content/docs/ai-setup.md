---
title: AI Setup
description: Use the 01mvp-blog Skill or a copyable prompt to let AI deploy your blog to Cloudflare.
---

## What You Need

Prepare these before you start:

| Item                          | Required    | Notes                                                      |
| ----------------------------- | ----------- | ---------------------------------------------------------- |
| Cloudflare account            | Yes         | Workers, D1, KV, R2, and custom domains live on Cloudflare |
| GitHub account                | Recommended | Keeps your blog code versioned and upgradeable             |
| AI coding agent               | Yes         | Codex, Claude Code, Cursor, or a similar tool              |
| Cloudflare plugin / connector | Recommended | Lets AI create D1, KV, R2, Workers, and DNS records        |
| Custom domain                 | Optional    | You can start with a `*.workers.dev` URL                   |

For readers in mainland China, a custom domain is recommended. Cloudflare's default `*.workers.dev` domain is often unavailable or unreliable in many mainland China network environments. A custom domain usually gives you more control. For long-term public operation, high traffic, or commercial usage in mainland China, handle the relevant domain, access, and compliance requirements separately.

## Recommended: Install the Skill

The Skill is the recommended path because it can be updated. If setup commands, Cloudflare provisioning steps, or verification checks change later, update the Skill and use the new flow.

1. Install the Cloudflare plugin / connector in Codex, Claude Code, or Cursor, then authorize your Cloudflare account.
2. Fork, clone, or download [`01MVP/blog-starter`](https://github.com/01MVP/blog-starter).
3. Install the `01mvp-blog` Skill:

```sh
npx skills@latest add 01MVP/blog-starter --skill 01mvp-blog --agent codex --yes
```

If you use another agent, replace `codex` with its lowercase agent id, such as `cursor` or `gemini-cli`.

4. Send this to your AI agent:

```txt
Please use the 01mvp-blog Skill to create a new personal blog from 01MVP/blog-starter. Prefer fully automatic GitHub repository setup, Cloudflare D1, KV, R2, Worker, DNS, D1 migrations, deployment, and live verification. Ask me only when Cloudflare login, domain confirmation, payment-method confirmation, OAuth secrets, or email verification requires manual action.
```

The agent will then collect your site name, author info, language, domain, theme, comments, and email preferences.

## Alternative: Copy This Prompt

If you do not want to install a Skill, copy the full prompt below. It follows the same workflow, but future template updates will require copying the latest version again.

```txt
You are my personal blog setup agent. Create and deploy a Cloudflare-native personal blog based on https://github.com/01MVP/blog-starter.

Goals:
- Create or use my GitHub repository for the blog code.
- Connect to my Cloudflare account.
- Automatically create and bind Cloudflare Worker, D1, KV, and R2.
- Write wrangler configuration, generate required secrets, run D1 migrations, and deploy the Worker.
- If I provide a custom domain, configure DNS and the Worker route. If the domain is not on Cloudflare yet, tell me which manual steps I need to complete.
- After deployment, verify the public home page, /blog, /admin, /openapi.json, RSS, sitemap, robots, D1 data, R2 upload, export, and backup.

Confirm these details first:
- Project name and GitHub repository name
- Blog name, description, author name, and author email
- Primary language: zh or en
- Domain: use *.workers.dev first, or bind a custom domain
- Theme preset: maker, apple, editorial, brutalist
- Layout preset: shelf, developer, journal
- Comments enabled or disabled
- GitHub / Google login enabled or disabled
- Email Sending enabled or disabled

Execution rules:
- Prefer automatic execution for everything available through CLI or API.
- Ask me only for Cloudflare login, account registration, domain purchase, nameserver changes, payment-method confirmation, OAuth app creation, and email verification.
- R2 is used for images, imports, exports, and backups. R2 usually requires a payment method before activation; if I want to skip it, explain which features are affected.
- Email Sending is optional and currently requires Workers Paid. If disabled, turn off email verification, password-reset email, and email notification features.
- A custom domain is optional but recommended. If the site mainly serves mainland China readers, do not rely only on *.workers.dev.
- Do not overwrite existing unconfirmed local changes. After each change, list modified files and verification results.

Final deliverables:
- GitHub repository URL
- Cloudflare Worker name
- D1, KV, and R2 resource names
- Public site URL and admin URL
- How to create the first admin account
- How to create an API Token
- Verification checklist and remaining manual steps
```

## What AI Can Do

| Task                        | Can AI handle it? | Notes                                                                 |
| --------------------------- | ----------------- | --------------------------------------------------------------------- |
| Clone or create repository  | Yes               | It can continue from a fork too                                       |
| Generate site configuration | Yes               | Language, theme, site info, and social links                          |
| Create D1 database          | Yes               | Stores posts, comments, users, settings, and API tokens               |
| Create KV namespace         | Yes               | Used for cache and short-lived records                                |
| Create R2 bucket            | Yes               | Your account must allow R2; payment-method confirmation may be needed |
| Generate secrets            | Yes               | For example `BETTER_AUTH_SECRET`                                      |
| Run D1 migrations           | Yes               | Applies schema to remote D1                                           |
| Deploy Worker               | Yes               | Produces the public URL                                               |
| Bind custom domain          | Usually           | Requires the domain to be on Cloudflare or nameservers to be switched |
| Verify live site            | Yes               | Home, admin, RSS, sitemap, OpenAPI, upload, export, and backup        |

## What You May Need To Do

The AI agent cannot complete every browser confirmation for you. Follow its instructions when one of these appears:

- Register or sign in to Cloudflare.
- Select a Cloudflare account.
- Buy a domain or switch its nameservers to Cloudflare.
- Confirm a payment method for the Cloudflare account.
- Create GitHub / Google OAuth Apps and copy Client ID / Client Secret.
- Verify sending domains, recipient addresses, or Email Sending permissions.
- Create the first admin account in the deployed admin panel.

## Advanced Options

### R2 Images And Backups

R2 stores images, import packages, exports, and ZIP backups. Cloudflare R2 includes a free tier and no egress fees, but accounts usually need a payment method before R2 can be activated. Small personal blog media usage usually stays inside the free tier; check [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) for the current limits.

If you skip R2, posts and comments can still work, but image upload, import, export, and backup workflows are affected.

### Email Sending

Email Sending is used for password reset emails, comment notifications, import/export notifications, and similar transactional messages. It is optional; the site can still publish posts, manage comments, upload images, and export backups without it.

Cloudflare Email Sending currently requires Workers Paid, while Email Routing can be used for inbound forwarding. Check [Cloudflare Email Service Pricing](https://developers.cloudflare.com/email-service/platform/pricing/) for the current plan details.

### Custom Domain

You can launch without a custom domain and use the default `*.workers.dev` URL. That URL is fine for testing, but it is often unavailable or unreliable in many mainland China network environments. For a public personal brand, bind your own domain:

- It looks and feels like a durable personal asset.
- It preserves links if you move infrastructure later.
- It gives you more control for mainland China access.
- Long-term stable, high-volume public access may require separate filing and access compliance work.

### API Tokens

After deployment, create a scoped API Token in the admin panel. AI agents, scripts, and automation tools can use `/openapi.json` plus the token to publish posts, upload images, export data, or moderate comments.
