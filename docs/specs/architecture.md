# Architecture

01mvp-blog-starter is a TanStack Start monorepo built for Cloudflare Workers. The repository ships both the reusable CMS template and the `01mvp-blog` AI initialization and maintenance Skill.

## Runtime

- `apps/web`: TanStack Start app deployed to Cloudflare Workers.
- `packages/core`: domain types, seed content, Markdown helpers, i18n-aware content helpers, and pure demo stores.
- `packages/db`: Drizzle schema plus D1 SQL migrations.
- `packages/ui`: shared shadcn/Base UI primitives and theme tokens.
- `skills/01mvp-blog`: agent workflow, OpenAPI maintenance guidance, templates, checklists, and first-run examples.

## Cloudflare Boundary

- Workers run the public site, admin UI, API routes, feeds, sitemap, and robots output.
- D1 stores posts, comments, site settings, Better Auth identities and sessions, API tokens, tags, and asset metadata.
- R2 stores uploaded assets, import packages, JSON exports, and full ZIP backups.
- KV is available as the `CMS_CACHE` binding for cache metadata.
- Turnstile and Cloudflare Email Sending are optional. Empty Turnstile and Email bindings do not block login, publishing, comment moderation, imports, exports, or backups.

## Internationalization

- Paraglide.js is the only UI translation runtime. Source messages live in `apps/web/messages/en.json` and `apps/web/messages/zh.json`; compiled files live in `apps/web/src/paraglide`.
- English and Chinese are always enabled.
- `primaryLanguage` is selected during initialization and stored in D1 site settings.
- `themePreset` is stored in site settings and drives the public site, admin UI, and auth screens through shared CSS tokens. Supported presets are `maker`, `apple`, `editorial`, and `brutalist`; legacy `claude` values normalize to `editorial`.
- `layoutPreset` is stored in site settings and controls the public home page structure. Supported presets are `shelf`, `developer`, and `journal`.
- Public product copy includes English and Chinese on the home page.
- Content records preserve bilingual fields through `i18n` JSON for posts, tags, comments, site name, site description, author bio, and SEO fields.

## Public And Admin Surfaces

- Public routes: home, blog list, post detail, tags, about, RSS, feed, sitemap, robots, API docs, and OpenAPI JSON.
- Admin routes: overview, posts, assets, comments, settings, and scoped API tokens.
- Admin and reader auth use the shared Better Auth tables on D1. The `user.role` column marks admin users; reader accounts can use GitHub OAuth, Google OAuth, or email/password.
- Automation tokens are stored hashed in D1 and checked by scope.

## Automation Flow

The Skill uses the same OpenAPI HTTP surface as the admin UI. A generated site can be initialized by provisioning Cloudflare resources through Cloudflare-specific skills, applying D1 migrations, creating the first admin, minting a scoped token, writing site settings, publishing the first bilingual post, uploading assets, submitting and approving a comment, and exporting a backup.

## Import Flow

Markdown imports parse simple frontmatter and preserve Markdown as the source of truth. HTML imports sanitize markup before persistence. ZIP and folder imports select Markdown first, then HTML, and fall back to an image gallery; image files are uploaded to R2 and local image references are rewritten to public asset URLs.

## Export And Backup Flow

JSON export remains the lightweight API response for automation. ZIP export packages Markdown, HTML, site settings, posts, comments, assets, tags, and a manifest under `export/`, stores the archive in R2, and rewrites known local asset URLs to relative paths inside the archive. Manual backups use `POST /api/backups` and the same ZIP builder.

## Email Flow

Email Sending is a no-op unless Cloudflare Email Sending is configured with `CMS_EMAIL_SENDING_ENABLED=true`, `CMS_EMAIL_FROM`, and a `CMS_EMAIL` send-email binding, or Resend is configured with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. When enabled, the same optional mailer sends comment moderation notices, import/export completion notices, backup completion notices, password reset links, and optional comment-account email verification links. Password reset tokens are stored in KV with a short TTL.

Email verification must stay behind the same optional outbound-email boundary and the admin `emailVerificationEnabled` setting. The core auth and publishing flows continue to work when outbound email is disabled or the admin toggle is off.
