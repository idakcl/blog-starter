# Acceptance

This document records the current evidence for the PRD acceptance scope. Dates are UTC unless the command output states otherwise.

## Production Site

- Canonical domain: `https://blog.01mvp.com`.
- Worker: `blog-starter`.
- Main Cloudflare resources are bound in `apps/web/wrangler.jsonc`.
- D1 migrations include `0001_cloud_blog_cms.sql`, `0002_better_auth_d1.sql`, `0003_pages_projects_management.sql`, `0004_comment_moderation.sql`, `0005_drop_projects.sql`, `0006_drop_legacy_auth_tables.sql`, `0007_drop_pages.sql`, and `0008_post_series.sql`.
- Email Sending is disabled by default and the core login, publishing, comments, moderation, import, export, backup, and password reset request paths do not depend on it.
- Blog post pages render canonical, Open Graph, Twitter Card, and JSON-LD `BlogPosting` metadata.
- The default Worker deploy does not publish a backup Cron Trigger. Backups are created manually from the admin UI or `POST /api/backups`.
- `pnpm deploy:web` runs the build, remote D1 migration, and Wrangler deploy sequence.
- Unauthenticated ZIP export and backup requests return HTTP 401 JSON responses.
- Unauthenticated post batch updates return HTTP 401 JSON with `requiredScope: "posts:write"`.
- Unauthenticated asset deletion returns HTTP 401 JSON with `requiredScope: "assets:write"`.
- `POST /api/admin/password-reset` for an unknown email returns HTTP 202 JSON with `accepted: true` and no email-existence signal.
- Confirming an invalid password reset token returns HTTP 400 JSON.

## Verification Scope

- Verify `/`, `/blog`, `/series`, `/tags`, `/about`, `/docs/api`, `/rss.xml`, `/feed.xml`, `/sitemap.xml`, `/sitemap-posts.xml`, `/robots.txt`, `/openapi.json`, and `/reset-password` on `blog.01mvp.com`.
- Verify blog post pages on `blog.01mvp.com` at desktop and mobile widths with no console errors and no horizontal overflow.
- Verify scheduled posts stay hidden from the public API until publish time.
- Verify top-level comments and one reply level return HTTP 201, while a reply to a reply returns HTTP 400.
- Verify MDX editor image uploads send multipart file data to `/api/assets`.

## Local Verification

- `pnpm --filter @repo/web exec tsc --noEmit`.
- `pnpm lint`.
- `pnpm build:web`.
- `git diff --check`.
