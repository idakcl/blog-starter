# Skill

The `01mvp-blog` Skill lives at `skills/01mvp-blog/SKILL.md`.

Its job is to let an AI agent initialize a new blog from this template, coordinate Cloudflare provisioning through Cloudflare-specific skills, create the first admin, publish a bilingual first post, upload media, verify comments and feeds, record an execution log, and maintain existing sites through `/openapi.json`.

## Required Inputs

The Skill collects:

- Project name
- Blog name and description
- Author name and email
- Primary language: `en` or `zh`
- Domain
- Theme preset: `maker`, `apple`, `editorial`, or `brutalist`
- Layout preset: `shelf`, `developer`, or `journal`
- Comments preference
- Email Sending preference
- GitHub Actions preference

English and Chinese remain enabled regardless of the primary language.
The theme preset is written to site settings and applied through shared UI tokens. The layout preset is written to site settings and controls the public home page structure.

## Automation Order

1. Check local prerequisites with `scripts/check-prereqs.sh`.
2. Create or clone the project.
3. Write site config from `templates/site.config.json`.
4. Recommend loading the relevant Cloudflare skills for account, resource, DNS, binding, and deploy work.
5. Create the first admin user.
6. Create or guide the user to create a scoped API token.
7. Fetch `/openapi.json` from the deployed site.
8. Push site settings through `PUT /api/site`.
9. Publish the first bilingual post through `POST /api/posts`.
10. Upload a media asset through `POST /api/assets`.
11. Submit and approve a comment.
12. If Email Sending is enabled, request a password reset email.
13. Export JSON through `GET /api/export` and create a ZIP backup through `POST /api/backups`.
14. Verify homepage, post page, admin, RSS, sitemap, robots, OpenAPI, OG metadata, localized API responses, JSON export, and ZIP backup.
15. Save an execution log.

## Production Evidence

The canonical production deployment uses:

- Site: `https://blog.01mvp.com`
- Worker: `blog-starter`

The production run should create site settings from `skills/01mvp-blog/templates/site.config.json`, publish a first bilingual post, upload an R2 asset, submit and approve a pending comment, generate an R2 export backup, verify scheduled post visibility on the public API, verify comment reply depth, and verify sitemap entries for home, posts, tags, docs, and about.

## User Intervention Points

Ask the user to act only for Cloudflare login, account registration, paid-plan confirmation, API token creation, DNS confirmation, domain verification, and email verification.
