# MakerJackie Blog Dogfood Rollout

Updated: 2026-06-05

## Goal

Use `01mvp-blog-starter` as the real production base for MakerJackie's personal blog.
The rollout should prove the public docs and `01mvp-blog` Skill can guide an AI agent from repo setup to Cloudflare deployment, article import, and domain binding.

## Confirmed Direction

- Keep the old `makerjackie.com` repository intact.
- Prefer `makerjackie/blog` for the new blog repository. If GitHub keeps redirecting that name to `makerjackie/old-blog`, use `makerjackie/mj-blog`.
- Deploy the new blog to `new.makerjackie.com` first.
- Move the existing site to `old.makerjackie.com` before any apex cutover.
- Do not delete the old site or old repository during this rollout.
- `blog.01mvp.com` production content should be updated through the site's API or admin surface.

## Public Setup Message

The public docs and landing page should say:

- The only hard prerequisite is a Cloudflare account.
- A custom domain is recommended but optional.
- Without a custom domain, Cloudflare's free `*.workers.dev` domain is often not accessible from mainland China.
- With a custom domain on Cloudflare, mainland China access is usually possible, but long-term stable high-volume access generally needs ICP filing.
- R2 is optional for image hosting, imports, exports, and backups. Opening R2 may require adding a payment method to Cloudflare. Usage inside the free tier should not incur storage charges, but users should understand it is usage-based billing.
- Email Sending, GitHub login, Google login, API keys, API tokens, and other integrations are advanced optional setup, not required to publish a basic blog.
- The AI agent should create Cloudflare D1, KV, R2, DNS, Worker bindings, migrations, and deployment configuration automatically when credentials are available. Human intervention should be limited to account login, payment-method confirmation, domain purchase, domain nameserver setup, and sensitive authorization prompts.

## Work Phases

### Phase 1 - Product Docs And Landing Page

- Add a beginner-friendly AI setup guide to public Fumadocs.
- Keep the guide bilingual if practical, with Chinese as the primary release surface.
- Add the guide to docs metadata.
- Update the landing page CTA and automation section so users see two paths:
  - recommended Skill install
  - copy-paste AI setup prompt
- Update `skills/01mvp-blog/SKILL.md` so it treats Cloudflare provisioning as agent-owned work rather than user-owned manual setup.
- Update README references if needed.

### Phase 2 - Validate And Deploy Blog Starter

- Run focused docs/site validation.
- Commit the coherent docs, Skill, and landing page slice.
- Push to `01MVP/blog-starter`.
- Deploy `blog.01mvp.com` or verify the push-triggered deployment.

### Phase 3 - Production Blog Content

- Update the existing `blog.01mvp.com` article from pre-release framing to formal release framing.
- Add a technical architecture article about Cloudflare, TanStack Start, D1, R2, KV, Better Auth, and OpenAPI.
- Add a beginner setup article based on the public guide.
- Verify the articles appear on the public blog and RSS or post API.

### Phase 4 - Marketing Content

- Write a MakerJackie-style public article introducing the project.
- Use `mj-adapt` to generate:
  - WeChat HTML with inline styles
  - WeChat cover image
  - Xiaohongshu long-form screenshot images
  - X/Twitter short post and thread
  - video recording script and demo flow

### Phase 5 - Dogfood New MakerJackie Blog

- Create or prepare the target GitHub repo, preferably `makerjackie/blog`, otherwise `makerjackie/mj-blog`.
- Use the `01mvp-blog` Skill workflow to initialize the site from `01MVP/blog-starter`.
- Provision Cloudflare resources automatically:
  - Worker
  - D1
  - KV
  - R2 if enabled
  - custom domain binding for `new.makerjackie.com`
- Import existing articles from `/Users/jackiexiao/code/makerjackie/makerjackie.com/content/blog`.
- Preserve existing dirty work in `makerjackie.com`, especially `content/blog/2026-06-05-ai-era-10x-leverage.mdx`.
- Verify public pages, admin, RSS, sitemap, robots, OpenAPI, imported posts, and backups.

### Phase 6 - Domain Transition

- Bind old site to `old.makerjackie.com` and verify it serves the current Next/Fumadocs site.
- Keep `makerjackie.com` unchanged until `new.makerjackie.com` is proven.
- Prepare apex cutover plan for `makerjackie.com` to point to the new blog-starter Worker.
- Execute apex cutover only after explicit verification of the new site.

## Current Evidence

- `blog-starter` current branch: `main`.
- `blog-starter` remote: `https://github.com/01MVP/blog-starter.git`.
- `makerjackie.com` current branch: `main`.
- `makerjackie.com` remote: `git@github.com:makerjackie/makerjackie.com.git`.
- `makerjackie.com` currently has uncommitted changes in `content/blog/2026-06-05-ai-era-10x-leverage.mdx`.
- `makerjackie.com` currently returns HTTP 200.
- `old.makerjackie.com` currently does not resolve.
- `blog.01mvp.com/openapi.json` currently returns OpenAPI 3.1.0.
- `blog.01mvp.com/api/posts` currently exposes the historical post `why-i-built-an-ai-maintained-personal-blog`.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are present in the environment.
- No `CMS_API_TOKEN` was present at the start of this rollout.

## Completion Checklist

- [ ] Public AI setup docs exist and are linked.
- [ ] Landing page points users to AI setup, not only generic docs.
- [ ] Skill owns Cloudflare provisioning steps clearly.
- [ ] `blog-starter` docs/site changes are committed, pushed, and deployed.
- [ ] Production `blog.01mvp.com` has the updated release article.
- [ ] Production `blog.01mvp.com` has the technical architecture article.
- [ ] Production `blog.01mvp.com` has the beginner setup article.
- [ ] Marketing article source exists.
- [ ] WeChat HTML and cover are generated.
- [ ] Xiaohongshu images are generated and visually checked.
- [ ] X/Twitter copy is generated.
- [ ] Video script and demo flow are generated.
- [ ] New GitHub repo exists.
- [ ] New MakerJackie blog is deployed to `new.makerjackie.com`.
- [ ] Old site is reachable at `old.makerjackie.com`.
- [ ] Old articles are migrated and verified on the new blog.
- [ ] Skill fixes found during dogfooding are committed back.
- [ ] Final report lists files, commits, URLs, validation commands, and remaining manual publishing steps.
