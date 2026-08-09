---
title: Comments
description: Let readers leave comments on your blog posts.
---

## What is the comment system

The comment system lets readers **leave messages below your blog posts** — just like comments on Medium or YouTube. Readers can share thoughts, ask questions, or give you feedback after reading an article.

## Why readers need to log in

Just like Twitter or Reddit, readers must log in before posting a comment. Here's why:

| Benefit           | Explanation                             |
| ----------------- | --------------------------------------- |
| Prevents spam     | Bots can't flood your comments          |
| Accountability    | Every comment has a known author        |
| Easier management | You can manage specific users if needed |

## How readers log in

Your readers have three ways to log in and comment:

- **GitHub one-click login** — log in with a GitHub account in one click (convenient for developer readers)
- **Google one-click login** — log in with a Google account in one click (most people have one)
- **Email + password** — register an account with an email address (fallback option, works for anyone)

> GitHub and Google login require a developer to configure for you. If not set up yet, readers can still use the email/password option to register and comment.

## Comment moderation

You can choose between two moderation modes:

| Mode                    | What happens                                          | Best for                                     |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------- |
| **Approve first**       | Comments don't appear publicly until you approve them | Sites with strict content standards          |
| **Publish immediately** | Comments appear right away                            | Trusting your readers, maximizing engagement |

You can switch between modes in your admin settings page with one click — no code changes or redeployment needed.

## Keyword blocking

You can set up a list of **blocked keywords** (such as spam phrases, profanity, etc.). When a reader's comment contains these words:

- **Auto-blocking enabled**: the comment is automatically marked as spam and hidden from public view
- **Auto-blocking disabled**: the comment enters your moderation queue for you to decide manually

You can update the keyword list anytime in your admin panel — no developer help needed.

## How to manage comments

All comment management happens in your **admin dashboard**:

- Go to the **Comments page** (`/admin/comments`) to: approve, mark as spam, or delete comments
- Go to the **Settings page** (`/admin/settings`) to: toggle comments on/off, switch moderation mode, manage blocked keywords

> Everything is done through the web-based admin panel — no coding or redeployment required.
