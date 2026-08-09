---
title: 01mvp-blog-starter
description: A ready-to-use personal blog system — get your own website up and running quickly.
---

## Understand This Project in 30 Seconds

**In one sentence**: This is a personal blog website template — fork it, configure it, deploy it, and you have your own website.

**Who is it for**: Anyone who wants to build a long-term personal brand, write articles, and own their content. Whether you're a product manager, designer, indie maker, or content creator — if you want a website you fully control (independent of any platform), this template is for you.

**What problem does it solve**:

- Content on platforms like Medium, Substack, or social media doesn't truly belong to you — platforms can remove posts, throttle reach, or shut down
- Building your own website usually requires extensive technical knowledge
- This template packages the technical parts so you can focus on "what to write"

## What Can This Website Do

Your website comes with two core areas by default. The key difference is how you manage them:

| Area | URL     | Purpose                                     | How you manage it                                  |
| ---- | ------- | ------------------------------------------- | -------------------------------------------------- |
| Blog | `/blog` | Write articles, receive reader comments     | Write, draft, and publish from the `/admin` panel  |
| Docs | `/docs` | Write product guides, tutorials, references | Maintain Markdown/MDX files in your Git repository |

**Blog** is for frequently updated content — today's thoughts, this week's recap, a new product announcement. It is a dashboard-managed dynamic content system for drafts, covers, comments, and publishing status.

**Docs** is for long-lived stable content — product manuals, tutorials, team guidelines. It is closer to an Obsidian-style local Markdown workflow: edit files in your own Git repository, commit them, and redeploy the site.

If you're unsure where a piece of content belongs, see the detailed [Content Systems](./content-systems) comparison.

## Tech Stack Overview

> You don't need to understand every item below. This is just to give you a rough picture. If a technical partner maintains your site, this information is useful for them.

| Technology         | What it does                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Cloudflare Workers | Where your website runs (analogy: a waiter who greets every visitor)                            |
| Cloudflare D1      | Database that stores articles, comments, and user info (analogy: a giant spreadsheet warehouse) |
| Cloudflare R2      | File storage for images, attachments, and backups (analogy: a filing cabinet)                   |
| React              | Tool for building the web interface (analogy: construction materials)                           |
| Tailwind CSS       | Tool for making the website look good                                                           |
| Markdown           | A simple writing format — plain text that produces formatted output                             |

**Why Cloudflare?**

Cloudflare is one of the world's largest network infrastructure companies. We chose it because:

1. **Generous free tier** — a personal blog's traffic rarely exceeds the free limits
2. **Global speed** — your site loads fast regardless of where your readers are
3. **Reliable** — enterprise-grade infrastructure, no downtime worries

## What's Next

If this is your first time with this project:

1. Read [AI Setup](./ai-setup) — let AI deploy the template to Cloudflare
2. Then read the [Usage Guide](./usage) — learn what you can do with this website
3. Interested in reader comments? See [Comments](./comments)

If you just want to understand the architecture:

- [Content Systems](./content-systems) — why there are two content systems
- [Publishing](./publishing) — different ways to publish articles
- [API](./api) — how automation tools interact with your site
