# Database

The canonical 01mvp-blog-starter schema is in `packages/db/src/schema/cms.sqlite.ts`. D1 migrations live in `packages/db/migrations`.

## Migrations

- `0001_cloud_blog_cms.sql`: site settings, posts, tags, assets, comments, API tokens, and content indexes.
- `0002_better_auth_d1.sql`: Better Auth users, sessions, credential/social accounts, and verification tokens on D1.
- `0003_pages_projects_management.sql`: legacy localized page content.
- `0004_comment_moderation.sql`: optional comment author linkage to Better Auth users.
- `0005_drop_projects.sql`: removes the legacy portfolio table.
- `0006_drop_legacy_auth_tables.sql`: removes legacy auth tables after Better Auth unification.
- `0007_drop_pages.sql`: removes the legacy pages table.
- `0008_post_series.sql`: adds curated post series and an optional one-series relationship on posts.

## Core Tables

- `site_settings`: JSON site configuration. The current row key is `site`.
- `posts`: Markdown-first articles with rendered HTML and plain text search cache.
- `series`: curated editorial collections. Each post can belong to one series.
- `tags` and `post_tags`: flexible many-to-many public taxonomy.
- `assets`: R2 object metadata and optional post association.
- `comments`: self-hosted moderation queue.
- `api_tokens`: hashed automation tokens with scoped permissions and revocation.
- `user`: Better Auth identity records for admins and readers. The `role` column separates admin users from reader accounts.
- `session`: Better Auth browser sessions.
- `account`: Better Auth credential and social account records, including password hashes.
- `verification`: Better Auth verification and reset token records.

## Content Fields

Posts keep three content forms:

- `content_markdown`: portable source content.
- `content_html`: rendered and sanitized output cache.
- `content_text`: plain text for simple D1 search.

Localized content is stored in JSON `i18n` columns on `posts`, `series`, `tags`, and `comments`. Site-level bilingual settings live inside `site_settings.value`.

## Security Notes

- Passwords and browser sessions are handled by Better Auth on top of Drizzle D1.
- API tokens are stored as SHA-256 hashes. Browser sessions are managed by Better Auth.
- API tokens expose the secret only once at creation.
- Comment author email addresses are hashed before storage.
