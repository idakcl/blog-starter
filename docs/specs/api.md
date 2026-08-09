# API

The API is exposed through TanStack Start server routes. Machine-readable OpenAPI is available at `/openapi.json`; the rendered guide is available at `/docs/api`.

## Public Routes

- `GET /rss.xml`
- `GET /feed.xml`
- `GET /sitemap.xml`
- `GET /sitemap-posts.xml`
- `GET /robots.txt`
- `GET /openapi.json`
- `GET /docs/api`

Feeds and public metadata use current D1 site settings and localized content where requested. `/rss.xml` returns 404 when RSS is disabled in site settings.

## Content And Automation Routes

- `GET /api/posts`
- `POST /api/posts`
- `POST /api/posts/batch`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET /api/series`
- `POST /api/series`
- `GET /api/series/:id`
- `PATCH /api/series/:id`
- `DELETE /api/series/:id`
- `POST /api/import/markdown`
- `POST /api/import/html`
- `POST /api/import/zip`
- `GET /api/assets`
- `POST /api/assets`
- `DELETE /api/assets/:id`
- `GET /api/site`
- `PUT /api/site`
- `GET /api/export`
- `POST /api/backups`
- `GET /api/comments`
- `POST /api/comments`
- `POST /api/comments/:id/approve`
- `POST /api/comments/:id/spam`
- `POST /api/comments/:id/delete`
- `GET /api/comment-auth/me`
- `POST /api/comment-auth/login`
- `POST /api/comment-auth/signup`
- `POST /api/comment-auth/logout`
- `GET /api/comment-auth/github/start`
- `GET /api/comment-auth/google/start`
- `GET /api/comment-auth/verify-email`
- `GET /api/admin/email-status`
- `GET /api/tokens`
- `POST /api/tokens`
- `POST /api/tokens/:id/revoke`
- `POST /api/admin/users`
- `PATCH /api/admin/password`
- `POST /api/admin/password-reset`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

Content, import, export, site, asset, and moderation routes accept scoped Bearer API tokens unless otherwise noted. Token management, admin user management, and admin password changes require a browser admin session.

`GET /api/posts` accepts `q`, `tag`, `series`, `status=all`, and `lang=en|zh`. `status=all` requires `posts:read`. Public post lists return only published posts.

`GET /api/site` returns localized site settings when `lang=en|zh` or `Accept-Language` is provided. `PUT /api/site` accepts `themePreset=maker|apple|editorial|brutalist` and `layoutPreset=shelf|developer|journal` along with title, URL, description, author, language, RSS, comments, comment approval, blocked keywords, auto-blocking, email verification, and indexing settings. Legacy `themePreset=claude` values normalize to `editorial`. `emailVerificationEnabled=true` is rejected unless Cloudflare Email Sending or Resend outbound email is configured.

`POST /api/posts` accepts `publishedAt`, optional `seriesId`, `seriesSlug`, or `seriesName`, plus bilingual `i18n` fields for title, excerpt, Markdown, rendered HTML, text, SEO title, and SEO description. When `locale` is `zh`, the primary input is also stored into Chinese localized fields. Creating or updating a `published` or `scheduled` post requires both `posts:write` and `posts:publish`. Scheduled posts become visible in public lists when `publishedAt` is reached.

`POST /api/posts/batch` accepts selected post ids and `action=publish|draft|archive|delete`. Publishing requires `posts:publish`; the other actions require `posts:write`.

`/api/series/*` manages curated post series. Series use the same write scope as posts, can be localized, and are referenced from posts as a single optional relationship.

`POST /api/import/markdown` accepts `filename`, `contentMarkdown`, optional post fields, and simple frontmatter. It derives title, slug, excerpt, tags, series, SEO fields, cover image, and status, then creates a D1 post.

`POST /api/import/html` accepts `filename`, `contentHtml`, and optional post fields. HTML is sanitized before persistence, and the importer extracts `<title>`, first `<h1>`, meta description, and first image where available.

`POST /api/import/zip` accepts either `contentBase64` for a ZIP archive or an automation `files` manifest. The importer selects Markdown first, then HTML, then image-gallery fallback; image entries are uploaded to R2 and local Markdown/HTML image references are rewritten to uploaded asset URLs.

`POST /api/assets` accepts multipart uploads from the admin UI and JSON/base64 uploads from OpenAPI automation. `DELETE /api/assets/:id` removes the D1 record and deletes the matching R2 object when present.

`GET /api/comments` returns the moderation queue and requires `comments:moderate`. `POST /api/comments` requires a comment-user session, accepts optional `parentId` for replies, applies honeypot, Turnstile when configured, per-IP rate limits, body length limits, link limits, and sets the initial status from site moderation settings. Keyword matches are marked `spam`; otherwise comments are `pending` when manual approval is enabled or `approved` when it is disabled.

`/api/comment-auth/*` is the comment-facing wrapper over Better Auth. Email/password login and signup use Better Auth credential accounts. When email verification is enabled in admin settings and an email provider is configured, signup sends a verification link through `/api/comment-auth/verify-email` and email/password login is blocked until the account is verified. GitHub login starts at `/api/comment-auth/github/start` and returns through Better Auth at `/api/auth/callback/github`; Google login uses `/api/comment-auth/google/start` and `/api/auth/callback/google`.

`GET /api/export` returns JSON data and writes a backup JSON object to R2. `GET /api/export?format=zip` returns a ZIP archive with Markdown posts, HTML posts, JSON manifests, comments, settings, series, tags, and bundled R2 assets; the ZIP is also written under the `exports/` prefix in the storage bucket.

`POST /api/backups` creates a ZIP export backup in R2 and applies the configured backup retention policy. It uses the same `export:read` scope as export.

`POST /api/admin/password-reset` requests an optional Email Sending reset link when `email` is provided, or confirms a reset when `token` and `password` are provided. `PATCH /api/admin/password` is an admin-session endpoint for signed-in administrators.

## Token Scopes

- `posts:read`
- `posts:write`
- `posts:publish`
- `assets:write`
- `comments:moderate`
- `site:read`
- `site:write`
- `export:read`
