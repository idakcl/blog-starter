---
title: Content Systems
description: Why are there two content systems? A plain-language explanation with real-life analogies.
---

## Why Two Systems?

Think about how you share information in daily life:

- **Social media / newsletter**: Post frequently, get comments, manage from your phone
- **Company handbook / wiki**: Stable reference material, reviewed before publishing, version-tracked

This website template works the same way — **Blog** is your newsletter, **Docs** is your company wiki. They serve different purposes and stay cleanly separated.

## Side-by-Side Comparison

|                      | Blog (`/blog`)                 | Docs (`/docs`)                                   |
| -------------------- | ------------------------------ | ------------------------------------------------ |
| **Analogy**          | Newsletter / social feed       | Company handbook / wiki                          |
| **Update frequency** | Often                          | Rarely                                           |
| **Where you write**  | Admin panel (in browser)       | Markdown/MDX files in the Git repository         |
| **Who manages it**   | The author, solo               | Repository maintainers through Git commits       |
| **Drafts?**          | Yes, with scheduled publishing | Via Git branches (like a document approval flow) |
| **Comments?**        | Yes                            | No                                               |
| **Image uploads?**   | Yes, directly in admin         | Yes, but placed in project files                 |
| **RSS feed**         | Included                       | Not included                                     |

## Blog: Your "Newsletter"

In the admin panel (`/admin`), you can:

- Write posts, save drafts, schedule publishing
- Upload cover images and media
- Manage comments
- Import/export content backups
- Let AI publish posts for you via the API

**Put this here**: Industry insights, product updates, tutorials, personal reflections — anything you'll publish and update frequently.

## Docs: Your "Company Wiki"

Documentation pages (like the one you're reading now) live in the project code, like a product manual or an Obsidian-style local Markdown notebook:

- Content is stable and doesn't change often
- You maintain it as local files in your Git repository
- Changes are committed and redeployed with the site
- Published together with the website code, keeping everything in sync

**Put this here**: Product manuals, how-to guides, developer docs, deployment instructions — anything you "write once and rarely touch."

## Quick Decision: Where Does It Go?

Ask yourself: **Will I likely edit this again next week?**

- "Probably yes" → put it in **Blog**
- "Probably not" → put it in **Docs**

> You can also use just one system if you prefer. Want only a blog with no docs? Or only docs with no blog? Just remove the part you don't need.
