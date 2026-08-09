---
title: Usage Guide
description: You don't need to be a developer to use this site. Here's what you can do, organized by scenario.
---

Think of this website template as a Swiss Army knife — different scenarios call for different tools. Let's walk through each one.

## Want to write a blog post?

**Go to the admin panel and write in your browser.**

Open `/admin` (just add `/admin` to your site's URL), log in, and you can:

- Write articles like you would in Google Docs (using Markdown format)
- Save drafts anytime without worrying about losing work
- Upload cover images and media
- Publish immediately or schedule a post for later
- Manage reader comments

Once published, your post automatically appears on the blog page, tag pages, and RSS feeds. **No code required.**

## Want to write product documentation?

**Edit the Markdown files in the project folder.**

Product docs (like the pages you're reading right now) live as files in the project. If you've used Notion or Google Docs, think of Markdown as "plain text with formatting shortcuts."

- English docs: `filename.md`
- Chinese docs: `filename.zh.md`

> New to Markdown? It's like keyboard shortcuts for formatting, but typed out. For example, `**bold**` makes text bold, and `- item` creates a bullet list. You can learn the basics in 5 minutes.

## Want AI to publish posts for you?

**Use the OpenAPI interface to let AI tools auto-publish.**

This site provides a standard API (think of it as "an instruction manual that machines can read"). Here's how:

1. In the admin settings page, create an API Token (like giving a key to the machine)
2. Hand that "key" to your AI tool or automation script
3. The AI can now publish posts and manage content on your behalf

Great for: batch publishing, AI-generated content going live automatically, or connecting other tools.

## Want to deploy and go live?

**One command does it all.**

When you're ready to make the site publicly visible:

```sh
pnpm deploy:web
```

> Think of this command as pressing the "launch button" — it automatically handles building, database migration, and content sync. If you have a technical colleague, just send them this command.

---

## Quick Reference

| I want to...            | Where to go                 | Do I need coding skills?   |
| ----------------------- | --------------------------- | -------------------------- |
| Write blog posts        | `/admin` panel              | No                         |
| Write product docs      | Markdown files in the repo  | Basic familiarity helps    |
| AI/automated publishing | OpenAPI interface           | One-time setup needed      |
| Deploy the site         | Run one command in terminal | Ask a tech-savvy colleague |
